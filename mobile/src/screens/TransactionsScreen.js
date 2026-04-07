import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, RefreshControl, TextInput
} from 'react-native'
import { transactionAPI, customerAPI, productAPI, fmt } from '../api/api'
import { Button, Input, Card, EmptyState, Badge, LoadingScreen } from '../components/UI'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'

const EMPTY = {
  transaction_type: 'sell', product_name: '', product: '',
  customer: '', customer_name: '', quantity: '', unit: 'cft',
  unit_price: '', notes: '',
  transaction_date: new Date().toISOString().split('T')[0], status: 'completed'
}
const UNITS = ['cft', 'ton', 'piece', 'sqft', 'kg']

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      const [txRes, sumRes] = await Promise.all([
        transactionAPI.list(params),
        transactionAPI.summary(params),
      ])
      setTransactions(txRes.data.results || txRes.data)
      setSummary(sumRes.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    customerAPI.list({ page_size: 100 }).then(r => setCustomers(r.data.results || r.data))
    productAPI.list({ page_size: 100 }).then(r => setProducts(r.data.results || r.data))
  }, [])

  const handleProductChange = (productId) => {
    const p = products.find(x => x.id == productId)
    setForm(f => ({
      ...f, product: productId,
      product_name: p?.name || f.product_name,
      unit_price: p?.price_per_unit || f.unit_price,
      unit: p?.unit || f.unit,
    }))
  }

  const handleSave = async () => {
    if (!form.product_name || !form.quantity || !form.unit_price) {
      Alert.alert('Error', 'Product name, quantity and unit price are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.customer) delete payload.customer
      if (!payload.product) delete payload.product
      await transactionAPI.create(payload)
      setModal(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      Alert.alert('Error', 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await transactionAPI.delete(id); load() } }
    ])
  }

  const total = form.quantity && form.unit_price
    ? (parseFloat(form.quantity) * parseFloat(form.unit_price)).toFixed(2)
    : '0.00'

  const renderItem = ({ item: t }) => (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.txnHeader}>
        <Badge
          label={t.transaction_type === 'sell' ? '↑ SELL' : '↓ BUY'}
          bg={t.transaction_type === 'sell' ? COLORS.primaryPale : COLORS.infoPale}
          color={t.transaction_type === 'sell' ? COLORS.primaryLight : COLORS.info}
        />
        <Text style={styles.txnDate}>{t.transaction_date}</Text>
        <TouchableOpacity onPress={() => handleDelete(t.id)}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
      <Text style={styles.txnProduct}>{t.product_name}</Text>
      {t.customer_name ? <Text style={styles.txnCustomer}>{t.customer_name}</Text> : null}
      <View style={styles.txnFooter}>
        <Text style={styles.txnQty}>{t.quantity} {t.unit} @ {fmt(t.unit_price)}</Text>
        <Text style={[styles.txnTotal, { color: t.transaction_type === 'sell' ? COLORS.primaryLight : COLORS.info }]}>
          {fmt(t.total_amount)}
        </Text>
      </View>
    </Card>
  )

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      {/* Summary */}
      {summary && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={[styles.summaryValue, { color: COLORS.primaryLight }]}>{fmt(summary.total_sales)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Purchases</Text>
            <Text style={[styles.summaryValue, { color: COLORS.info }]}>{fmt(summary.total_purchases)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text style={[styles.summaryValue, { color: summary.net >= 0 ? COLORS.primaryLight : COLORS.danger }]}>{fmt(summary.net)}</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={15} color="#999" />
          <TextInput
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={styles.typeButtons}>
          {[['', 'All'], ['sell', 'Sales'], ['buy', 'Buys']].map(([v, l]) => (
            <TouchableOpacity
              key={v}
              onPress={() => setTypeFilter(v)}
              style={[styles.typeBtn, typeFilter === v && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, typeFilter === v && styles.typeBtnTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={t => t.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState icon="📦" title="No transactions found" />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setForm(EMPTY); setModal(true) }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Transaction</Text>
          <TouchableOpacity onPress={() => setModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.toggleRow}>
            {[['sell', '↑ Sale'], ['buy', '↓ Purchase']].map(([v, l]) => (
              <TouchableOpacity
                key={v}
                onPress={() => setForm(f => ({ ...f, transaction_type: v }))}
                style={[styles.toggleBtn, form.transaction_type === v && { backgroundColor: v === 'sell' ? COLORS.primaryPale : COLORS.infoPale, borderColor: v === 'sell' ? COLORS.primaryLight : COLORS.info }]}
              >
                <Text style={[styles.toggleBtnText, form.transaction_type === v && { color: v === 'sell' ? COLORS.primaryLight : COLORS.info, fontWeight: '700' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Date" value={form.transaction_date} onChangeText={v => setForm(f => ({ ...f, transaction_date: v }))} placeholder="YYYY-MM-DD" />

          <Text style={styles.fieldLabel}>Product (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {products.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleProductChange(p.id)}
                style={[styles.chipBtn, form.product == p.id && styles.chipBtnActive]}
              >
                <Text style={[styles.chipText, form.product == p.id && { color: COLORS.primary }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input label="Product Name *" value={form.product_name} onChangeText={v => setForm(f => ({ ...f, product_name: v }))} placeholder="e.g. Teak Wood" />

          <Text style={styles.fieldLabel}>Customer (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {customers.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setForm(f => ({ ...f, customer: c.id, customer_name: c.name }))}
                style={[styles.chipBtn, form.customer == c.id && styles.chipBtnActive]}
              >
                <Text style={[styles.chipText, form.customer == c.id && { color: COLORS.primary }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input label="Customer Name" value={form.customer_name} onChangeText={v => setForm(f => ({ ...f, customer_name: v }))} placeholder="Customer name" />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input label="Quantity *" value={form.quantity} onChangeText={v => setForm(f => ({ ...f, quantity: v }))} placeholder="0.00" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Unit Price ₹ *" value={String(form.unit_price)} onChangeText={v => setForm(f => ({ ...f, unit_price: v }))} placeholder="0.00" keyboardType="decimal-pad" />
            </View>
          </View>

          {/* Unit selector */}
          <Text style={styles.fieldLabel}>Unit</Text>
          <View style={styles.unitRow}>
            {UNITS.map(u => (
              <TouchableOpacity key={u} onPress={() => setForm(f => ({ ...f, unit: u }))} style={[styles.unitBtn, form.unit === u && styles.unitBtnActive]}>
                <Text style={[styles.unitText, form.unit === u && { color: COLORS.primary, fontWeight: '700' }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>

          <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes" multiline numberOfLines={2} />

          <Button title={saving ? 'Saving...' : 'Save Transaction'} onPress={handleSave} loading={saving} style={{ marginTop: 8, marginBottom: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summaryBar: { backgroundColor: '#fff', flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  filterBar: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: COLORS.text },
  typeButtons: { flexDirection: 'row', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5' },
  typeBtnActive: { backgroundColor: COLORS.primaryPale },
  typeBtnText: { fontSize: 12, color: COLORS.textMuted },
  typeBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  txnHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  txnDate: { flex: 1, fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginRight: 8 },
  txnProduct: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txnCustomer: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txnFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  txnQty: { fontSize: 12, color: COLORS.textMuted },
  txnTotal: { fontSize: 15, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#fff' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16, backgroundColor: '#fff' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  toggleBtnText: { fontSize: 13, color: COLORS.textMuted },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipBtnActive: { backgroundColor: COLORS.primaryPale, borderColor: COLORS.primaryLight },
  chipText: { fontSize: 12, color: COLORS.textMuted },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: 'transparent' },
  unitBtnActive: { backgroundColor: COLORS.primaryPale, borderColor: COLORS.primaryLight },
  unitText: { fontSize: 12, color: COLORS.textMuted },
  totalBox: { backgroundColor: COLORS.primaryPale, borderRadius: 10, padding: 14, marginBottom: 14, alignItems: 'center' },
  totalLabel: { fontSize: 12, color: COLORS.textMuted },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
})
