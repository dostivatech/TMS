import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { invoiceAPI, fmt } from '../api/api'
import { Badge, Card, EmptyState, LoadingScreen } from '../components/UI'
import { COLORS, STATUS_COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'
import ModalHeader from '../components/ModalHeader'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
]

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigation = useNavigation()
  const [modal, setModal] = useState(false)

const EMPTY_FORM = {
  customer: null,
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  tax_rate: '0',
  discount: '0',
  notes: '',
  items: [{ description: '', quantity: 1, unit_price: '' }]
}


const [form, setForm] = useState(EMPTY_FORM)
  const load = useCallback(async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const { data } = await invoiceAPI.list(params)
      setInvoices(data.results || data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const renderItem = ({ item: inv }) => {
    const badge = STATUS_COLORS[inv.status] || STATUS_COLORS.draft
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('InvoiceDetail', { id: inv.id })}
      >
        <Card style={{ marginBottom: 8 }}>
          <View style={styles.invHeader}>
            <Text style={styles.invNumber}>{inv.invoice_number}</Text>
            <Badge label={badge.label} bg={badge.bg} color={badge.color} />
          </View>
          <Text style={styles.invCustomer}>{inv.customer_name}</Text>
          <View style={styles.invDates}>
            <Text style={styles.invDate}>Issued: {inv.issue_date}</Text>
            <Text style={[styles.invDate, inv.is_overdue && { color: COLORS.danger }]}>
              Due: {inv.due_date}
              {inv.is_overdue ? ` (${inv.days_overdue}d late)` : ''}
            </Text>
          </View>
          <View style={styles.invAmounts}>
            <View style={styles.invAmountItem}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>{fmt(inv.total_amount)}</Text>
            </View>
            <View style={styles.invAmountItem}>
              <Text style={styles.amountLabel}>Paid</Text>
              <Text style={[styles.amountValue, { color: COLORS.primaryLight }]}>{fmt(inv.amount_paid)}</Text>
            </View>
            <View style={styles.invAmountItem}>
              <Text style={styles.amountLabel}>Balance</Text>
              <Text style={[styles.amountValue, { color: inv.balance_due > 0 ? COLORS.danger : COLORS.primaryLight }]}>
                {fmt(inv.balance_due)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingScreen />

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color="#999" />
        <TextInput
          placeholder="Search invoice or customer..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#aaa"
        />
      </View>

      {/* Status tabs */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={i => i.value}
        showsHorizontalScrollIndicator={false}
        style={styles.tabsBar}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            onPress={() => setStatusFilter(tab.value)}
            style={[styles.tab, statusFilter === tab.value && styles.tabActive]}
          >
            <Text style={[styles.tabText, statusFilter === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={invoices}
        renderItem={renderItem}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState icon="🧾" title="No invoices found" subtitle="Invoices will appear here" />}
      />
      <Modal visible={modal} animationType="slide">
          <TouchableOpacity onPress={() => setModal(false)}>
               <ModalHeader
                 title="Create Invoice"
                onClose={() => setModal(false)}
                        />
          </TouchableOpacity>

        <ScrollView style={{ padding: 16 }}>

            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
            Create Invoice
            </Text>

          {/*  Customer (reuse UI) */}
        <TouchableOpacity
         style={{ backgroundColor: '#fff', padding: 12, borderRadius: 10 }}
         onPress={() =>
         navigation.navigate('Customers', {
          selectMode: true,
          onSelect: (c) => {
            setForm(f => ({
              ...f,
              customer: c.id,
              customer_name: c.name,
              customer_phone: c.phone,
              customer_address: c.address
            }))
            setModal(false)
          }
        })
      }
    >
      <Text>{form.customer_name || 'Select Customer'}</Text>
    </TouchableOpacity>

    {/* Due Date */}
    <TextInput
      placeholder="Due Date"
      value={form.due_date}
      onChangeText={(v) => setForm(f => ({ ...f, due_date: v }))}
      style={styles.searchBar}
    />

    {/* ITEMS */}
    {form.items.map((item, i) => (
      <View key={i} style={{ marginTop: 10 }}>
        <TextInput
          placeholder="Item"
          value={item.description}
          onChangeText={(v) => {
            const items = [...form.items]
            items[i].description = v
            setForm({ ...form, items })
          }}
          style={styles.searchBar}
        />

        <TextInput
          placeholder="Qty"
          value={String(item.quantity)}
          onChangeText={(v) => {
            const items = [...form.items]
            items[i].quantity = Number(v)
            setForm({ ...form, items })
          }}
          style={styles.searchBar}
        />

        <TextInput
          placeholder="Price"
          value={String(item.unit_price)}
          onChangeText={(v) => {
            const items = [...form.items]
            items[i].unit_price = Number(v)
            setForm({ ...form, items })
          }}
          style={styles.searchBar}
        />
      </View>
    ))}

    {/* ADD ITEM */}
     <TouchableOpacity onPress={() =>
      setForm(f => ({
        ...f,
        items: [...f.items, { description: '', quantity: 1, unit_price: '' }]
       }))
      }>
      <Text style={{ color: COLORS.primary }}>+ Add Item</Text>
     </TouchableOpacity>

     {/* TOTAL */}
      <Text style={{ marginTop: 10 }}>
       Total: ₹{form.items.reduce((s, it) => s + it.quantity * it.unit_price, 0)}
      </Text>

      {/* SAVE */}
      <TouchableOpacity
       style={{
        backgroundColor: COLORS.primary,
        padding: 14,
        borderRadius: 10,
        marginTop: 20
        }}
        onPress={async () => {
        await invoiceAPI.create(form)
        setModal(false)
        load()
        }}
        >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
        Create Invoice
        </Text>
        </TouchableOpacity>

        </ScrollView>
      </Modal>
      <TouchableOpacity
  style={{
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center'
  }}
  onPress={() => setModal(true)}
>
  <Ionicons name="add" size={24} color="#fff" />
</TouchableOpacity>
    </View>
  )
} 

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: COLORS.text },
  tabsBar: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 6, backgroundColor: '#f5f5f5' },
  tabActive: { backgroundColor: COLORS.primaryPale },
  tabText: { fontSize: 12, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invNumber: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  invCustomer: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  invDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  invDate: { fontSize: 11, color: COLORS.textMuted },
  invAmounts: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  invAmountItem: { alignItems: 'center' },
  amountLabel: { fontSize: 10, color: COLORS.textMuted },
  amountValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
})
