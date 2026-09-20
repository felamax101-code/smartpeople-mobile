








import { ModeratorRoleKey, PanelItem, PanelType } from '@/types';

// Human-readable labels for the "View My Roles" modal.
export const ROLE_LABELS: Record<ModeratorRoleKey, string> = {
  manage_members: 'Manage Members',
  manage_posts: 'Manage Posts',
  manage_events: 'Manage Events',
  manage_reports: 'Manage Reports',
  manage_settings: 'Group Settings',
};

/**
 * Every panel button lives here. To add a new button later, add an
 * entry — no other file needs to change.
 *
 * - Admin panel: shows every item in this list, always.
 * - Moderator panel: only shows items whose `moderatorRoles` intersects
 *   the roles assigned to that moderator by the backend. Omit
 *   `moderatorRoles` to make an item admin-only (e.g. "Add Admin").
 */




export const PANEL_ITEMS: PanelItem[] = [
  {
    key: 'edit',
    label: 'Edit Community Details',
    info:"Edit community cover image,name,description and guidelines",
    route: ({slug})=> `/community/editGroupDetails/${slug}`,
    moderatorRoles: ['manage_members'],
  },

  {
    key: 'pendingpost',
    label: 'New Pending Post',
    info:"Approve or reject new  posts from your members",
    route: ({slug})=> `/community/ApproveRejectPost/${slug}`,
    moderatorRoles: ['manage_events'],
  },
   {
    key: 'addcategories',
    label:'Community Categories',
    info:"Add or remove community post categories",
    route: ({slug})=> `/community/AddCategories/${slug}`,
    moderatorRoles: ['manage_events'],
  },



  {
    key: 'members',
    label: ' Members',
    info:"Add or remove members and manage pending invites/requests",
    route: ({communityslug})=> `/community/GroupMembers/${communityslug}`,
    moderatorRoles: ['manage_posts'],
  },
  {
    key: 'yourrecentactions',
    label: 'Your Recent Actions',
    
    route: ({slug})=> `/community/ApproveRejectPost/${slug}`,
    moderatorRoles: ['manage_events'],
  },


 
  {
    key: 'otheradminsRecentActions',
    label: "Other Admin's Recent Actions",
    route: ({slug})=> '/group//posts',
    moderatorRoles: ['manage_reports'],
  },
  {
    key: 'moderatoractions',
    label: ' Moderator Actions',
    info:"Actions perfomed by other moderators",
    route: ({slug})=> '/group//posts',
    moderatorRoles: ['manage_settings'],
  },
  {
    key: 'add-admin',
    label: 'Add Admin',
    route: ({slug})=> `/community/AddAdminModeratorScreen`,
    // no moderatorRoles -> admin panel only
  },
  {
    key: 'add-moderator',
    label: 'Add Moderator',
    route: ({slug})=> `/community/AddAdminModeratorScreen`,
    // no moderatorRoles -> admin panel only
  },
];

export function getVisiblePanelItems(
  panelType: PanelType,
  slug:string,
  assignedRoles: ModeratorRoleKey[]
): PanelItem[] {
  if (panelType === 'admin') return PANEL_ITEMS;

  return PANEL_ITEMS.filter((item) =>
    item.moderatorRoles?.some((r) => assignedRoles.includes(r))
  );
}
