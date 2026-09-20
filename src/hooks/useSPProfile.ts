

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { useAuthGate } from "@/hooks/useAuthGate"
import { userService } from "@/services/user.service"
import {  propertyProfileService } from "@/services/SPProfile.service"
export const useSPProfile = (username: string) => {
  const queryClient = useQueryClient()
  const { user: currentUser, setUser } = useAuthStore()
  const { gatedAction } = useAuthGate()

  const isOwn = currentUser?.username === username

  //  fetch profile ─
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ["sp-profile", username],
    queryFn: () =>
      propertyProfileService.getOtherPersonProfile(username),
    staleTime: 3 * 60 * 1000,
  })

  //  follow toggle 
  const followMutation = useMutation({
    mutationFn: () => userService.toggleFollow(username),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["profile", username] })
      const previous = queryClient.getQueryData(["profile", username])

      // optimistic update
      queryClient.setQueryData(["profile", username], (old: any) => {
        if (!old) return old
        const isFollowing = old.is_following
        return {
          ...old,
          is_following: !isFollowing,
          followers: isFollowing
            ? (old.followers ?? 0) - 1
            : (old.followers ?? 0) + 1,
        }
      })
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["profile", username], context?.previous)
    },
  })

  const handleFollow = () => {
    gatedAction(
      { type: "follow", userId: profile?.id as unknown as string},
      () => followMutation.mutate()
    )
  }

  //  update profile (own only) ─
  const updateMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: (updated) => {
      // update both profile cache and auth store
      queryClient.setQueryData(["profile", username], updated)
      setUser(updated)
    },
  })

  return {
    profile,
    isLoading,
    isError,
    refetch,
    isOwn,
    isFetching,
    handleFollow,
    isFollowLoading: followMutation.isPending,
    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}








