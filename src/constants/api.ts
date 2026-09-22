

export const API = {
  DJANGO_BASE_URL:"https://api.smartpipla.com/api",
  MESSAGE_ENDPOINT: process.env.EXPO_PUBLIC_FASTAPI_URL ?? "https://api.smartpipla.com/messaging",
  WS_BASE_URL: process.env.EXPO_PUBLIC_WS_URL ?? "https://api.smartpipla.com",
}

// feed endpoints
export const ENDPOINTS = {
  // feed
  FEED: "/feed/",
  CATEGORIES: "/categories/",
  PRODUCT_DETAIL: (slug: string) => `/post/${slug}/`,
  PRODUCT_UPVOTE: (slug: string) => `/post/${slug}/upvote/`,
  PRODUCT_BUY_INTENT: (slug: string) => `/post/${slug}/buy-intent/`,

  // comments
  COMMENTS: (slug: string) => `/post/${slug}/comments/`,

  // wishlist
  WISHLIST: "/wishlist/",
  WISHLIST_TOGGLE: (id: string) => `/wishlist/${id}/`,

  // auth
  LOGIN: "/login/",
  REGISTER: "/register/",
  LOGOUT: "/logout/",
  REFRESH: "/token/refresh/",

  // user
  FA:"/users/me/2fa-status/",
  ME: "/users/me/",
  PROFILE: (username: string) => `/users/${username}/`,
  FOLLOW: (username: string) => `/users/${username}/follow/`,
  NOTIFICATIONS: "/notifications/",
  FCM_TOKEN: "/users/me/fcm-token/",
}







