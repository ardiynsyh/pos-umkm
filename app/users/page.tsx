'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { db, User } from '@/lib/db/database';
import { Button, Input, Modal, Card } from '@/components/ui';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'kasir' as 'owner' | 'kasir',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await db.users.toArray();
    setUsers(allUsers);
  };

  const handleSave = async () => {
    if (editingUser?.id) {
      // Update
      await db.users.update(editingUser.id, {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        updatedAt: new Date(),
      });
    } else {
      // Create
      await db.users.add({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    setIsModalOpen(false);
    setFormData({ username: '', password: '', name: '', role: 'kasir' });
    loadUsers();
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await db.users.update(id, {
      isActive: !currentStatus,
      updatedAt: new Date(),
    });
    loadUsers();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus user ini?')) {
      await db.users.delete(id);
      loadUsers();
    }
  };

  return (
    <ProtectedRoute requireOwner>
      <Navbar />
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormData({ username: '', password: '', name: '', role: 'kasir' });
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Tambah User
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'owner'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => toggleActive(user.id!, user.isActive)}
                          disabled={user.role === 'owner'}
                          className="flex items-center gap-1"
                        >
                          {user.isActive ? (
                            <>
                              <UserCheck className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Aktif</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 text-red-600" />
                              <span className="text-red-600">Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user);
                              setFormData({
                                username: user.username,
                                password: user.password,
                                name: user.name,
                                role: user.role,
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.role !== 'owner' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(user.id!)}
                            >
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
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Tambah User'}
      >
        <div className="space-y-4">
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Password"
            />
          </div>

          {/* Nama Lengkap Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nama"
            />
          </div>

          {/* Role Select */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'owner' | 'kasir' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kasir">Kasir</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}