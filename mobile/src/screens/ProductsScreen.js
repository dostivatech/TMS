import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, TextInput, RefreshControl
} from 'react-native'
import { productAPI, fmt } from '../api/api'
import { Button, Input, Badge, EmptyState, LoadingScreen } from '../components/UI'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'

const EMPTY = { name: '', unit: 'cft', price_per_unit: '', stock_quantity: '0', description: '', is_active: true }
const UNITS = ['cft', 'ton', 'piece', 'sqft', 'kg']

export default function ProductsScreen() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await productAPI.list(search ? { search } : {})
      setProducts(data.results || data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, price_per_unit: String(p.price_per_unit), stock_quantity: String(p.stock_quantity) }); setModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.price_per_unit) { Alert.alert('Error', 'Name and price are required'); return }
    setSaving(true)
    try {
      if (editing) await productAPI.update(editing.id, form)
      else await productAPI.create(form)
      setModal(false)
      load()
    } catch { Alert.alert('Error', 'Failed to save product') }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => {
    Alert.alert('Delete Product', 'Delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await productAPI.delete(id); load() } }
    ])
  }

  const renderItem = ({ item: p }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Text style={{ fontSize: 22 }}>🌲</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.prodName}>{p.name}</Text>
          <Badge
            label={p.is_active ? 'Active' : 'Inactive'}
            bg={p.is_active ? COLORS.primaryPale : '#f5f5f5'}
            color={p.is_active ? COLORS.primaryLight : '#999'}
          />
        </View>
        <View style={styles.prodDetails}>
          <View style={styles.prodDetailItem}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{fmt(p.price_per_unit)}/{p.unit}</Text>
          </View>
          <View style={styles.prodDetailItem}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={styles.detailValue}>{p.stock_quantity} {p.unit}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.actionBtn}>
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
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#aaa"
        />
      </View>

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={p => p.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState icon="📦" title="No products yet" subtitle="Add your wood product catalog" />}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editing ? 'Edit Product' : 'New Product'}</Text>
          <TouchableOpacity onPress={() => setModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Input label="Product Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Teak Wood" />
          <Text style={styles.fieldLabel}>Unit</Text>
          <View style={styles.unitRow}>
            {UNITS.map(u => (
              <TouchableOpacity key={u} onPress={() => setForm(f => ({ ...f, unit: u }))} style={[styles.unitBtn, form.unit === u && styles.unitBtnActive]}>
                <Text style={[styles.unitText, form.unit === u && { color: COLORS.primary, fontWeight: '700' }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Price per Unit (₹) *" value={form.price_per_unit} onChangeText={v => setForm(f => ({ ...f, price_per_unit: v }))} placeholder="0.00" keyboardType="decimal-pad" />
          <Input label="Stock Quantity" value={form.stock_quantity} onChangeText={v => setForm(f => ({ ...f, stock_quantity: v }))} placeholder="0" keyboardType="decimal-pad" />
          <Input label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Optional description" multiline numberOfLines={2} />

          <TouchableOpacity onPress={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={styles.checkRow}>
            <View style={[styles.checkbox, form.is_active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
              {form.is_active && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>Active (visible in transactions)</Text>
          </TouchableOpacity>

          <Button title={saving ? 'Saving...' : editing ? 'Update Product' : 'Add Product'} onPress={handleSave} loading={saving} style={{ marginBottom: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: COLORS.text },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.primaryPale, alignItems: 'center', justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  prodName: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  prodSpecies: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },
  prodDetails: { flexDirection: 'row', gap: 16, marginTop: 6 },
  prodDetailItem: {},
  detailLabel: { fontSize: 10, color: COLORS.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  cardActions: { gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f5f5f5' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 8 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: 'transparent' },
  unitBtnActive: { backgroundColor: COLORS.primaryPale, borderColor: COLORS.primaryLight },
  unitText: { fontSize: 12, color: COLORS.textMuted },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 14, color: COLORS.text },
})
