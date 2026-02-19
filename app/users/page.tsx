'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { Button, Input, Modal, Card } from '@/components/ui';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

interface User {
  id: string;
  nama: string;
  email: string;
  role: 'ADMIN' | 'KASIR' | 'MANAGER';
  outletId?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'KASIR' as 'ADMIN' | 'KASIR' | 'MANAGER',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      console.error('Gagal load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.email) {
      alert('Nama dan email harus diisi');
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (editingUser) {
        res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        if (!formData.password) {
          alert('Password harus diisi');
          setSaving(false);
          return;
        }
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal menyimpan user');
      }

      setIsModalOpen(false);
      setFormData({ nama: '', email: '', password: '', role: 'KASIR' });
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus user ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus user');
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Gagal menghapus user');
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nama: user.nama,
      email: user.email,
      password: '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    setFormData({ nama: '', email: '', password: '', role: 'KASIR' });
    setIsModalOpen(true);
  };

  const roleColor = (role: string) => {
    if (role === 'ADMIN') return 'bg-purple-100 text-purple-800';
    if (role === 'MANAGER') return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <ProtectedRoute requireOwner>
      <Navbar />

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <Button onClick={openAdd}>
              <Plus className="w-5 h-5 mr-2" />
              Tambah User
            </Button>
          </div>

          <Card>
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Memuat data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.nama}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.role !== 'ADMIN' && (
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Tambah User'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <Input
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editingUser && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="KASIR">Kasir</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
