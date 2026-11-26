import { patch } from '../lib/api';
import { Dialog, Form, Field, string, useFeedback } from './ui';
import { roleLabel } from './Layout';

export function UserAccessDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: {
    id: string;
    name?: string;
    username: string;
    role: string;
    roles?: string[];
    employee_id?: string;
    active: boolean;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useFeedback();
  return (
    <Dialog title={`Akses · ${editing.name || editing.username}`} onClose={() => onClose()}>
      <Form
        cancel={() => onClose()}
        onSubmit={async (d) => {
          await patch(`/users/${editing.id}`, {
            role: string(d, 'role'),
            roles: Array.from(new Set([string(d, 'role'), ...d.getAll('roles').map(String)])),
            active: d.get('active') === 'on',
          });
          onClose();
          onSaved();
          notify('Hak akses diperbarui.');
        }}
      >
        <Field label="Peran awal saat masuk">
          <select name="role" defaultValue={editing.role}>
            {Object.entries(roleLabel).map(([key, label]) => (
              <option key={key} value={key} disabled={key === 'PEGAWAI' && !editing.employee_id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="role-grants">
          <legend>Peran yang diizinkan</legend>
          <p className="muted">
            Pengguna hanya dapat beralih ke peran yang Anda berikan. Peran awal selalu disertakan.
          </p>
          {Object.entries(roleLabel).map(([key, label]) => (
            <label className="checkbox-field" key={key}>
              <input
                type="checkbox"
                name="roles"
                value={key}
                defaultChecked={(editing.roles || [editing.role]).includes(key)}
                disabled={key === 'PEGAWAI' && !editing.employee_id}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="checkbox-field">
          <input type="checkbox" name="active" defaultChecked={editing.active} />
          Akun aktif
        </label>
        <p className="muted">Perubahan akan menghentikan sesi aktif pengguna.</p>
      </Form>
    </Dialog>
  );
}
