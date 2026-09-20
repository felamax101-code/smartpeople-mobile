
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
// maps notification_type → icon + navigation target

export interface NotificationConfig {
  icon: React.ReactNode
  color: string
  getTitle: (data: Record<string, string>) => string
  getTarget: (data: Record<string, string>) => string | null
}

export const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  post_approved: {
    icon: <MaterialCommunityIcons name="check-circle-outline" color={"green"} size={18}/>,
    color: "#10B981",
    getTitle: () => "Listing Approved",
    getTarget: (data) =>
      data.community_slug
        ? `/community/post/${data.slug}`
        : data.slug ? `/post/${data.slug}` 
        : data.isSP?
        `/sp/post/${data.slug}`
        : null,
  },
  post_rejected: {
    icon: <MaterialCommunityIcons name="cross-outline" color={"red"} size={18}/>,
    color: "#EF4444",
    getTitle: () => "Listing Rejected",
    getTarget: (data) =>
      data.community_slug
        ? `/community/post/${data.slug}`
        : data.slug ? `/post/${data.slug}`
        : data.isSP?
        `sp/post/${data.slug}`
        :null,
  },
  new_follower: {
    icon: <MaterialCommunityIcons name="account-outline" color={"blue"} size={18}/>,
    color: "#6C63FF",
    getTitle: (data) => `@${data.username ?? "Someone"} followed you`,
    getTarget: (data) =>
      data.username ? `/profile/${data.username}` : null,
  },
  post_upvote: {
    icon: <MaterialCommunityIcons name="heart-outline" color={"red"} size={18}/> ,
    color: "#EF4444",
    getTitle: (data) =>
      `@${data.username ?? "Someone"} liked your listing`,
    getTarget: (data) =>
      data.community_slug
        ? `/community/post/${data.slug}`
        : data.slug ? `/post/${data.slug}` : 
         data.isSP?
        `/sp/post/${data.slug}`
        :null,
  },
  new_comment: {
    icon: <MaterialCommunityIcons name="heart-outline" size={18}/>,
    color: "#3B82F6",
    getTitle: (data) =>
      `@${data.username ?? "Someone"} commented on your listing`,
    getTarget: (data) =>
      data.community_slug
    ?`/community/post/${data.slug}`
      :data.slug
        ? `/post/${data.slug}?tab=comments`
        : data.isSP?
        `/sp/post/${data.slug}`
        : null,
  },
  comment_reply: {
    icon: <MaterialCommunityIcons name="reply-outline" color={"blue"} size={18}/>,
    color: "#3B82F6",
    getTitle: (data) =>
      `@${data.username ?? "Someone"} replied to your comment`,
    getTarget: (data) =>
      data.community_slug
    ?`/community/post/${data.slug}`
      :data.slug
        ? `/post/${data.slug}?tab=comments`
        : data.isSP?
        `/sp/post/${data.slug}`
        :null
        ,
  },
  new_review: {
    icon: <MaterialCommunityIcons name="star" color={"yellow"}size={18}/>,
    color: "#F59E0B",
    getTitle: (data) =>
      `@${data.username ?? "Someone"} left you a review`,
    getTarget: (data) =>
      data.username ? `/profile/${data.username}` : null,
  },
  account_warning: {
    icon: <MaterialCommunityIcons name="alert-circle-outline" color={"yellow"} size={18}/>,
    color: "#F59E0B",
    getTitle: () => "Account Warning",
    getTarget: () => "/settings",
  },
  account_suspended: {
    icon: <MaterialCommunityIcons name="account-cancel-outline" color={"red"} size={18}/>,
    color: "#EF4444",
    getTitle: () => "Account Suspended",
    getTarget: () => "/settings/appeal",
  },
  verification: {
    icon: "🪪",
    color: "#10B981",
    getTitle: () => "Verification Update",
    getTarget: () => "/settings",
  },


  appeal_update: {
    icon: <MaterialCommunityIcons name="file-document-edit-outline" size={18}/>,
    color: "#8B5CF6",
    getTitle: () => "Appeal Update",
    getTarget: () => "/settings",
  },
  
  two_fa: {
    icon: <MaterialCommunityIcons name="shield-alert-outline" size={18}/>,
    color: "#6C63FF",
    getTitle: () => "Security Alert",
    getTarget: () => "/settings/security",
  },
  system: {
    icon: <MaterialCommunityIcons name="bell-cog-outline" size={18}/>,
    color: "#6B7280",
    getTitle: () => "System Notification",
    getTarget: () => null,
  },
}

export const getNotificationConfig = (type: string): NotificationConfig =>
  NOTIFICATION_CONFIG[type] ?? NOTIFICATION_CONFIG.system









