import { supabase } from '../lib/supabase';
import { getNextPromotionRole, getRoleLabel } from '../lib/rolePromotion';

export async function promoteMemberRole(targetUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('promote_member_role', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    console.error('[Z&D] promote_member_role failed', {
      targetUserId,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    throw new Error(error.message);
  }

  const newRole = String(data);
  console.log('[Z&D] Member promoted', { targetUserId, newRole, label: getRoleLabel(newRole) });
  return newRole;
}

export function describePromotion(targetRole: string | null | undefined): string | null {
  const next = getNextPromotionRole(targetRole);
  if (!next) return null;
  return getRoleLabel(next);
}
