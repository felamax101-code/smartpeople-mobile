

//most community endpoints hooks

import { useInfiniteQuery,useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityservice } from '@/services/community.sevice';
import { UsersSearchResponse, PendingRequestsResponse, PendingInvitesResponse,AdminRole } from '@/types';
// --- Infinite queries (used with FlatList onEndReached) ---------------
//list community members
export function useMembersQuery(cslug: string, search: string) {
  return useInfiniteQuery({
    queryKey: ['group-members', cslug, search],
    queryFn: ({ pageParam = 1 }) => communityservice.fetchGroupMembers(cslug, pageParam, search) as unknown as UsersSearchResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages,
    },
    staleTime:2000
  });
}

//list admin and modeartors
export function useAdminsModerators(cslug: string, search: string) {
  return useInfiniteQuery({
    queryKey: ['group-admin$moderators', cslug, search],
    queryFn: ({ pageParam = 1 }) => communityservice.getAdimnModerator(cslug, pageParam, search) as unknown as UsersSearchResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // if there's a next page URL, return next page number
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages,
    },
     staleTime:2000
  });
}
//list commnity pending requests received
export function usePendingRequestsQuery(cslug: string, search: string) {
  return useInfiniteQuery({
    queryKey: ['group-pending-requests', cslug, search],
    queryFn: ({ pageParam = 1 }) => communityservice.fetchPendingRequests(cslug, pageParam, search) as unknown as PendingRequestsResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages
    },
     staleTime:2000
  });
}
//list commnity pending invites sent

export function usePendingInvitesQuery(cslug: string, search: string) {
  return useInfiniteQuery({
    queryKey: ['group-pending-invites', cslug, search],
    queryFn: ({ pageParam }) => communityservice.fetchPendingInvites(cslug, pageParam, search) as unknown as PendingInvitesResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages
    },
     staleTime:2000
  });
}

// Search for NEW users to invite (not existing members/requests/invites).
export function useInviteSearchQuery(cslug: string, search: string) {
  return useInfiniteQuery({
    queryKey: ['group-invite-search', cslug, search],
    queryFn: ({ pageParam }) => communityservice.searchUsersToInvite(cslug, pageParam, search) as unknown as UsersSearchResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages
    },
    enabled: search.trim().length > 0,
     staleTime:2000
  });
}

// --- Mutations ----------------------------------------------------------
//remove community member
export function useRemoveMember(cslug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => communityservice.removeMember(cslug, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-members', cslug] });
      qc.invalidateQueries({ queryKey: ['group-admin$moderators', cslug] });

    },
  });
}
//approve request received
export function useApproveRequest(cslug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => communityservice.approveRequest(cslug, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-pending-requests', cslug] });
      qc.invalidateQueries({ queryKey: ['group-members', cslug] });

    },
  });
}
//reject request received -PRIVATE COM
export function useRejectRequest(cslug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => communityservice.rejectRequest(cslug, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-pending-requests', cslug] }),
  });
}
//cancell invite sent by admin/modearotor
export function useCancelInvite(cslug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => communityservice.cancelInvite(cslug, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-pending-invites', cslug] }),
  });
}
//invite user by admin or modearot-PRIVATE/PUBLIC/INVITE-ONLY
export function useInviteUser(cslug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => communityservice.inviteUser(cslug, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-pending-invites', cslug] });
      qc.invalidateQueries({ queryKey: ['group-invite-search', cslug] });
      qc.invalidateQueries({ queryKey: ['role-assignment-search'] });
    },
  });
}
//search users to assign roles -both members and non members
export function useRoleAssignmentSearchQuery(cslug: string, role: AdminRole, search: string) {
  return useInfiniteQuery({
    queryKey: ['role-assignment-search', cslug, role, search],
    queryFn: ({ pageParam }) =>
      communityservice.searchUsersForRoleAssignment(cslug, pageParam, search, role) as unknown as UsersSearchResponse,
    initialPageParam: 1,
    getNextPageParam: (lastPage,allPages) =>{
      if (lastPage.data.pagination.has_next) {return allPages.length+1}
      return undefined},
    enabled: search.trim().length > 0,
  });
}

// Same invite action as the regular "Invite Members" flow — inviting here
// just gets the person into the group. Promoting them to admin/moderator
// is a separate, subsequent action once they show up as isMember: true.

//make a user admin or moderator
export function useAssignRole(slug: string, role: AdminRole) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => communityservice.assignRole(slug, userId, role),
    onSuccess: () => {qc.invalidateQueries({ queryKey: ['role-assignment-search', slug] });
                    qc.invalidateQueries({ queryKey:  ['group-admin$moderators'] });}
  });
}
export function addCategory(slug: string, category: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => communityservice.addCategory(slug, category),
    onSuccess: () => {qc.invalidateQueries({queryKey: ["com-admin-categories", slug] });
                    qc.invalidateQueries({ queryKey: ["categories", slug]});}
  });

}

  export function removeCategory(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id:string) => communityservice.removeCategory(slug, id),
    onSuccess: () => {qc.invalidateQueries({queryKey: ["com-admin-categories", slug] });
                    qc.invalidateQueries({ queryKey: ["categories", slug]});}
  });
}
//requestto join a agroup-PRIVATE
export function useRequestToJoinAGroup(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => communityservice.joinGroupRequest(slug),
    onSuccess: () => {qc.invalidateQueries({ queryKey: ['role-assignment-search', slug] });
                    qc.invalidateQueries({ queryKey:  ['group-admin$moderators'] });}
  });
}







// lisT my modeartor roles
export function useMyModeratorRoles(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['my-moderator-roles', slug],
    queryFn: () => communityservice.fetchModeratorRoles(slug),
    enabled,
  });
}













