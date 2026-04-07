import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, TextInput, RefreshControl
} from 'react-native'
import { customerAPI, fmt } from '../api/api'
import { Button, Input, EmptyState, LoadingScreen } from '../components/UI'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'

const EMPTY = { name: '', phone: '', email: '', address: '', gstin: '', notes: '' }

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await customerAPI.list(search ? { search } : {})
      setCustomers(data.results || data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (c) => { setEditing(c); setForm(c); setModal(true) }

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Error', 'Name is required'); return }
    setSaving(true)
    try {
      if (editing) await customerAPI.update(editing.id, form)
      else await customerAPI.create(form)
      setModal(false)
      load()
    } catch { Alert.alert('Error', 'Failed to save customer') }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => {
    Alert.alert('Delete Customer', 'Delete this customer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await customerAPI.delete(id); load() } }
    ])
  }

  const getAvatarColor = (name) => {
    const colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b']
    return colors[name.charCodeAt(0) % colors.length]
  }

  const renderItem = ({ item: c }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(c.name) }]}>
          <Text style={styles.avatarText}>{c.name[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName}>{c.name}</Text>
          {c.phone ? <Text style={styles.custInfo}>📞 {c.phone}</Text> : null}
          {c.email ? <Text style={styles.custInfo}>✉️ {c.email}</Text> : null}
          {c.gstin ? <Text style={styles.custGst}>GST: {c.gstin}</Text> : null}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{c.total_transactions || 0} transactions</Text>
            {c.total_amount > 0 && <Text style={[styles.statText, { color: COLORS.primary }]}> · {fmt(c.total_amount)}</Text>}
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(c)} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(c.id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color="#999" />
        <TextInput
          placeholder="Search customers..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#aaa"
        />
      </View>

      <FlatList
        data={customers}
        renderItem={renderItem}
        keyExtractor={c => c.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState icon="👥" title="No customers yet" subtitle="Add your first customer" />}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editing ? 'Edit Customer' : 'New Customer'}</Text>
          <TouchableOpacity onPress={() => setModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Input label="Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Customer name" />
          <Input label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" />
          <Input label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
          <Input label="GSTIN" value={form.gstin} onChangeText={v => setForm(f => ({ ...f, gstin: v }))} placeholder="GST number" autoCapitalize="characters" />
          <Input label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Full address" multiline numberOfLines={3} />
          <Button title={saving ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'} onPress={handleSave} loading={saving} style={{ marginBottom: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: COLORS.text },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  cardLeft: { flex: 1, flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  custName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  custInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  custGst: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 6 },
  statText: { fontSize: 11, color: COLORS.textMuted },
  cardActions: { gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f5f5f5' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
})
