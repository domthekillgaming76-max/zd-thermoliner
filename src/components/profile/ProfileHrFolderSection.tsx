import { DriverHrFolderSection } from '../drivers/DriverHrFolderSection';

export type ProfileHrFolderSectionProps = {
  isOwnProfileContext?: boolean;
};

/** Alias profile-scoped mount for DriverHrFolder on /profile */
export function ProfileHrFolderSection({
  isOwnProfileContext = true,
}: ProfileHrFolderSectionProps = {}) {
  return <DriverHrFolderSection isOwnProfileContext={isOwnProfileContext} />;
}
