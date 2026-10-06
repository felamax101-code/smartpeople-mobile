export interface RegisterPayload {
    name: string
    username: string
    email: string
    password: string

}
export interface ListingFilterValues {
  location?: string
  house_type?: string
  min_price?: string
  max_price?: string
  category?:string
  condition?: PostCondition
  negotiable?: boolean
  sort?: SortOption
  lat?: number
  lng?: number
  radius?: number
  search?: string
  page?: number
}

export interface LoginPayload {
    email: string
    password: string
}

export interface LoginResponse {
    success: boolean
    requires_2fa: boolean
    message: string
    // only present when requires_2fa = true
    temp_token?: string
    method?: "email" | "sms" | "totp"
}
export interface User {
  id: string
  username: string
  name: string
  avatar: string | null
  role: "client" | "seller" | "business" | "staff" | "admin"
  bio: string | null
  phone: string | null
  email: string | null
  is_email_verified: boolean
  phone_verified: boolean
  followers: number | null    // null if hidden by privacy
  following: number | null
  total_posts: number
  rating: number
  reviews_count: number
//   verification_level: VerificationLevel
//   verification_badge: VerificationBadge
  can_message: boolean        // from privacy settings
  can_follow: boolean
  created_at: string
  member_since?:string
  location: string | null
}



//  Shared 
export interface FeedApiResponse {
  success: boolean;
  data: {
    posts: Post[];
    pagination:PaginationMeta
  };
}
export interface UsersSearchResponse {
 success: boolean;
 data:{
  users: SearchableUser[]
     pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
}}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  data: T[]
  results: T[]
  posts: T[]
}
export interface CommentApiResponse {
  success: boolean;
  data: {
    comments: Comment[];
    pagination:PaginationMeta
  };
}
export interface Member extends UserSummary{
  role?:"admin"|"moderator"|"member"
}

export interface Invites{
  id:string;
  community_name:string;
  created_at:string;
  community_slug:string;
}

export interface MyInvites{
  success: boolean;
  data: {
    invites: Invites[];
    pagination:PaginationMeta
  };
}
export interface MyRequests{
  success: boolean;
  data: {
    requests: Invites[];
    pagination:PaginationMeta
  };
}

export interface ReviewApiResponse {
  success: boolean;
  data: {
    reviews: Review[];
    pagination:PaginationMeta
  };
}







export interface PendingRequestsResponse {
 success: boolean;
  data: {
    join_requests:PendingRequest[];
    pagination: PaginationMeta
  };
}


export interface UsersSearchResponse {
 success: boolean;
 data:{
  users: SearchableUser[]
    pagination: PaginationMeta
 }
}
export interface PaginationMeta{
   page: number;
      page_size: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
}
export interface PendingInvitesResponse {
 success: boolean;
  data: {
    pending_invites:PendingInvite[];
    
    pagination: PaginationMeta
  };
}
export interface Review {
  id: string
  reviewer: {
    id: string
    username: string
    avatar: string | null
    verification_badge: {
      label: string | null
      color: string | null
    }
  }
  rating: number       // 1-5
  comment: string
  created_at: string
}

export interface DisableCode {
  method: string
  code: string
}
//  User ─

export type VerificationLevel = 0 | 1 | 2 | 3 | 4

export interface VerificationBadge {
  label: string | null
  color: string | null
  icon: string | null
}



//  Category ─

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  order: number
}

//  Post 

export type PostCondition = "new" | "used" | "refurbished"
export type PostStatus = "pending" | "approved" | "rejected"

export interface PostImage {
  id: string
  image: string     // URL
  order: number
}
export interface PostVideo {
  id: string
  video: string
  order: number
  processing_status:"uploading" | "processing" | "done" | "failed"
}

export interface Report {
  reason: string
}


export interface MediaFiles {
  id: string
  uri: string
  name: string
  type: string
}
export interface PropertyProfile {
  id: string
  uri: string
  name: string
  org_name: string
}
export interface Post {
  id: string
  slug: string
  name: string
  description: string
  price: string           // decimal as string from DRF
  negotiable: boolean
  condition: PostCondition
  status: PostStatus
  category: Category
  owner: {
    id: string
    username: string
    name: string
    avatar: string | null
    verification_level: VerificationLevel
    verification_badge: VerificationBadge
    rating: number
    reviews_count: number
    total_posts: number
  }
  images: PostImage[]
  videos: PostVideo[]
  location_display: string | null
  location_lat: number | null
  location_lng: number | null
  distance_km: number | null  // only present when sort=nearest
  upvotes_count: number
  comments_count: number
  saves_count: number
  views_count: number
  sponsored: boolean
  is_saved: boolean           // current user saved this? (null if guest)
  is_upvoted: boolean
  created_at: string
  post_type:"text"|"video"|"image",
  listing_type:string
  monthly_installment:string
  deposit:string
  rooms:string
  client_upload_id?:string
  rejection_reason?:string
  property_profile:PropertyProfile

}

//  Comment 

export interface Reply_to {

  id: string | null
  username: string | null
}


interface RepliedToComment{
  body :string
}
export interface Comment {
  id: string
  body: string
  parent_id: string | null
    replied_to: RepliedToComment|null

  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
    verification_badge: VerificationBadge
  }
  upvotes_count: number
  reply_to: Reply_to | null
  downvotes_count: number
  replies_count: number
  is_deleted: Boolean
  is_edited: Boolean
  created_at: string
  has_upvoted: Boolean,
  has_downvoted: Boolean

}

//  Feed ─

export type SortOption = "newest" | "most_viewed" | "most_upvoted" | "nearest"

export interface FeedFilters {
  category?: string       // slug
  condition?: PostCondition
  min_price?: string
  max_price?: string
  negotiable?: boolean
  sort?: SortOption
  lat?: number
  lng?: number
  radius?: number
  search?: string
  page?: number
}

//  Auth ─

export type PendingActionType =
  | "upvote"
  | "save"
  | "comment"
  | "message"
  | "buy_intent"
  | "follow"

export interface PendingAction {
  type: PendingActionType
  postId?: string
  postSlug?: string
  userId?: string
  comment?: string
}

//  Notification ─

export interface Notification {
  id: string
  notification_type: string
  title: string
  body: string
  data: Record<string, string>
  is_read: boolean
  created_at: string
}





export type PosterType = 'user' | 'app';

/** Where the content lives */
export type ContentType = 'internal' | 'external';

/** The current user's vote on a post */
export type VoteType = 'up' | 'down' | null;

/** Moderation lifecycle */
export type NewsStatus = 'pending' | 'published' | 'flagged' | 'removed';

export interface NewsAuthor {
  id: string;
  username: string;
  avatar?: string | null;
}


export type GroupPrivacy = 'public' | 'private' | 'invite_only';

export interface UserSummary {
  id: string;
  username: string;
  avatar?: string;
}




export interface PendingRequest extends UserSummary {
  id: string;
  requester:UserSummary[]
  // id of the join-request record (not the user id)
}

export interface PendingInvite {
  id: string; // id of the invite record (not the user id)
  invited:UserSummary
}




export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  slug:string

  /**
   * Full rich text — only present when contentType === 'internal'.
   * External posts never carry this; navigate to externalUrl instead.
   */
  content?: string;

  /**
   * Link to the original article — only present when contentType === 'external'.
   * Opened via expo-web-browser (in-app sheet, not the OS browser).
   */
  external_url?: string;

  image_url?: string | null;

  /** 'user' = community post · 'app' = official / admin post */
  poster_type: PosterType;

  /** 'internal' = hosted content · 'external' = link to third-party source */
  content_type: ContentType;

  author: NewsAuthor;

  /**
   * Human-readable source label shown on the card.
   * For user posts this echoes the author's name.
   * Both are searchable.
   */
  source_name: string;

  upvotes: number;
  downvotes: number;

  /** null = not voted, 'up' | 'down' = current user's vote */
  user_vote: VoteType;

  tags?: string[];
  created_at: string; // ISO 8601
}


export interface VotePayload {
  newsId: string;
  voteType: VoteType; // null → remove vote
}

export interface ReportPayload {
  newsId: string;
  reason: string;
  additionalNote?: string;
}

export interface NewsFeedParams {
  search?: string;
  page?: number;
  pageSize?: number;
}



export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
}


export type AdminRole="admin"| "moderator"|"member"

export interface SearchableUser extends UserSummary{
  is_member:boolean
}


// --- Admin / Moderator panel -------------------------------------------

export type PanelType = 'admin' | 'moderator';

// Fixed, backend-defined set of moderator permissions. Not user-configurable —
// just extend this union as new roles get defined on the backend.
export type ModeratorRoleKey =
  | 'manage_members'
  | 'manage_posts'
  | 'manage_events'
  | 'manage_reports'
  | 'manage_settings';

// Shape of the "roles assigned to me" JSON field from the backend.
export interface MyModeratorRoles {
  roles: ModeratorRoleKey[];
}

export interface PanelItem {
  key: string;
  label: string;
  info?:string;
  route:(params:{slug:string,communityslug?:string})=>string; // expo-router path this button navigates to
  // Roles (from MyModeratorRoles) that unlock this button on the
  // MODERATOR panel. Admins always see every item regardless of this
  // field. Leave undefined/empty to make an item admin-only.
  moderatorRoles?: ModeratorRoleKey[];
}

