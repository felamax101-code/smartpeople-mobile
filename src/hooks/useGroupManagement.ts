
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { messagingService } from "@/services/messaging.service"

//  Types 
// These mirror the Pydantic schemas on the server.

export interface GroupMember {
    id: string
    username: string
    avatar: string | null
    is_admin: boolean
    joined_at: string | null
}

export interface CreateGroupPayload {
    group_name: string
    participant_ids: string[]   // does NOT include the caller — server adds them
    initial_message: string
}

export interface AddMembersPayload {
    conversationId: string
    user_ids: string[]
}

export interface RemoveMemberPayload {
    conversationId: string
    targetUserId: string
}

export interface UpdateGroupPayload {
    conversationId: string
    group_name?: string
    group_avatar?: string
}

//  Hook 

export const useGroupManagement = (conversationId?: string) => {
    const queryClient = useQueryClient()

    //  load member list (used in Group Info sheet) ─
    const membersQuery = useQuery({
        queryKey: ["group-members", conversationId],
        queryFn: () => messagingService.getGroupMembers(conversationId!),
        enabled: !!conversationId,    // only runs when a conversationId is provided
        staleTime: 30_000,            // members list changes rarely — cache for 30 s
    })

    //  create a new group 
    const createGroupMutation = useMutation({
        mutationFn: (payload: CreateGroupPayload) =>
            messagingService.createGroup(payload),

        onSuccess: (newConversation) => {
            // Append the new group to the conversation list immediately
            queryClient.setQueryData(
                ["conversations"],
                (old: any[] | undefined) =>
                    old ? [newConversation, ...old] : [newConversation]
            )
        },
    })

    //  add members (admin only) 
    const addMembersMutation = useMutation({
        mutationFn: ({ conversationId, user_ids }: AddMembersPayload) =>
            messagingService.addGroupMembers(conversationId, user_ids),

        onSuccess: (_, { conversationId }) => {
            // Invalidate so the members list refreshes
            queryClient.invalidateQueries({ queryKey: ["group-members", conversationId] })
            // Also invalidate the conversation itself (participant count changed)
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
        },
    })

    //  remove a member (admin only) 
    const removeMemberMutation = useMutation({
        mutationFn: ({ conversationId, targetUserId }: RemoveMemberPayload) =>
            messagingService.removeGroupMember(conversationId, targetUserId),

        onSuccess: (_, { conversationId, targetUserId }) => {
            // Optimistically remove from the local members list
            queryClient.setQueryData(
                ["group-members", conversationId],
                (old: GroupMember[] | undefined) =>
                    old?.filter((m) => m.id !== targetUserId) ?? []
            )
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
        },
    })

    //  leave group (any member) ─
    const leaveGroupMutation = useMutation({
        mutationFn: (cid: string) => messagingService.leaveGroup(cid),

        onSuccess: (_, cid) => {
            // Remove the conversation from the list — user no longer belongs
            queryClient.setQueryData(
                ["conversations"],
                (old: any[] | undefined) =>
                    old?.filter((c) => c.id !== cid) ?? []
            )
            // Clear the now-irrelevant message cache
            queryClient.removeQueries({ queryKey: ["messages", cid] })
        },
    })

    //  update group name / avatar (admin only) 
    const updateGroupMutation = useMutation({
        mutationFn: ({ conversationId, ...rest }: UpdateGroupPayload) =>
            messagingService.updateGroup(conversationId, rest),

        onSuccess: (updated) => {
            // Update the conversation in the list with the new name/avatar
            queryClient.setQueryData(
                ["conversations"],
                (old: any[] | undefined) =>
                    old?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) ?? []
            )
        },
    })

    //  handle group WS events (call these from your WS onEvent handler) 

    const handleGroupMemberAdded = (data: {
        conversation_id: string
        added_user_ids: string[]
        added_usernames: string[]
    }) => {
        // Invalidate members list so it reloads with the new people
        queryClient.invalidateQueries({ queryKey: ["group-members", data.conversation_id] })
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
    }

    const handleGroupMemberRemoved = (data: {
        conversation_id: string
        removed_user_id: string
    }) => {
        queryClient.setQueryData(
            ["group-members", data.conversation_id],
            (old: GroupMember[] | undefined) =>
                old?.filter((m) => m.id !== data.removed_user_id) ?? []
        )
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
    }

    const handleGroupUpdated = (data: {
        conversation_id: string
        group_name: string
        group_avatar: string | null
    }) => {
        // Update name/avatar in conversations list without a full refetch
        queryClient.setQueryData(
            ["conversations"],
            (old: any[] | undefined) =>
                old?.map((c) =>
                    c.id === data.conversation_id
                        ? { ...c, group_name: data.group_name, group_avatar: data.group_avatar }
                        : c
                ) ?? []
        )
    }

    return {
        // queries
        members: (membersQuery.data as GroupMember[] | undefined) ?? [],
        membersLoading: membersQuery.isLoading,
        isError:membersQuery.isError,
        refetch:membersQuery.refetch,
        // mutations
        createGroup: createGroupMutation.mutate,
        isCreating: createGroupMutation.isPending,
        createError: createGroupMutation.error,

        addMembers: addMembersMutation.mutate,
        isAddingMembers: addMembersMutation.isPending,

        removeMember: removeMemberMutation.mutate,
        isRemoving: removeMemberMutation.isPending,

        leaveGroup: (conversationId: string, options?: { onSuccess?: () => void }) =>
            leaveGroupMutation.mutate(conversationId, { onSuccess: options?.onSuccess }),

        updateGroup: updateGroupMutation.mutate,
        isUpdating: updateGroupMutation.isPending,

        isLeaving:leaveGroupMutation.isPending,
        // WS event handlers — plug into your existing WS onEvent switch
        handleGroupMemberAdded,
        handleGroupMemberRemoved,
        handleGroupUpdated,
    }
}




