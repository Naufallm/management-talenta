import { UserRound } from 'lucide-react';

export function EmployeeAvatar({
  size = 'default',
  employeeId,
  version,
}: {
  size?: 'small' | 'default' | 'card' | 'large';
  employeeId?: string | null;
  version?: string | null;
}) {
  return (
    <span className={`avatar employee-avatar ${size}`} aria-hidden="true">
      <UserRound size={size === 'large' ? 30 : size === 'card' ? 26 : size === 'small' ? 17 : 20} />
      {employeeId && version && (
        <img
          key={version}
          src={`/api/employees/${encodeURIComponent(employeeId)}/photo?v=${encodeURIComponent(version)}`}
          alt=""
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
