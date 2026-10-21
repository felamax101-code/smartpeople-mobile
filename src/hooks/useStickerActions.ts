import { useMutation, useQueryClient } from "@tanstack/react-query"
import { stickerService } from "@/services/sticker.service"
import { Sticker } from "@/types"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"

/**
 * Save / remove a sticker from "My stickers".
 * Usable anywhere (picker, comment long-press). Both refresh the My stickers list.
 */
export const useStickerActions = () => {
  const queryClient = useQueryClient()
  const {showNotifToast}=useNotificationToast()
  console.log("hhhh")
  const refreshMine = () =>
    queryClient.invalidateQueries({ queryKey: ["stickers", "mine"] })

  const save = useMutation<void, Error, Sticker>(
    {
    mutationFn: (sticker) => stickerService.save(sticker),
    onSuccess:()=>{showNotifToast("Saved to your picker","success"); refreshMine},
    onError:()=>{showNotifToast("Error saving.Try again.","error"); refreshMine},
}
  )

  const unsave = useMutation<void, Error, Sticker>({
    mutationFn: (sticker) => stickerService.unsave(sticker),
    onSuccess:()=>{showNotifToast("Removed from your picker","success"); refreshMine},
    onError:()=>{showNotifToast("Error removing.Try again.","error"); refreshMine},

  })

  return { save, unsave }
}