export interface RoomPermission {
  id: string;
  room_key: string;
  room_name: string;
  description: string | null;
  category: string;
  icon: string;
  color: string;
  route: string;
  sort_order: number;
  enabled: boolean;
  visible_to_roles: string[];
  admin_critical: boolean;
  created_at: string;
  updated_at: string;
}

export type RoomPermissionPatch = Partial<
  Pick<
    RoomPermission,
    | 'room_name'
    | 'description'
    | 'category'
    | 'icon'
    | 'color'
    | 'route'
    | 'sort_order'
    | 'enabled'
    | 'visible_to_roles'
    | 'admin_critical'
  >
>;
