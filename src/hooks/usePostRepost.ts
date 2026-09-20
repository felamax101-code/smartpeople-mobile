import { useNotificationToast } from "@/components/activityIndicator/ToastNotification";
import { feedService } from "@/services/feed.service";
import { useMutation } from "@tanstack/react-query";

 export const usePostRepost=(slug:string)=>{
    const {showNotifToast}=useNotificationToast()
  const repostMutation = useMutation({
    mutationFn: () => feedService.repostPost(slug),
    onSuccess:()=>{
showNotifToast("Reposted to followers","success")
    },
      
    onError: () => {
      showNotifToast("Repost failed.Try again","error")
     
    },
    
  })
  const handleRepost=()=>{
    repostMutation.mutate()
  }

return {handleRepost}
}
