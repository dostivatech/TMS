import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, RefreshControl
} from 'react-native'
import { invoiceAPI, paymentAPI, fmt } from '../api/api'
import { Button, Input, Badge, LoadingScreen } from '../components/UI'
import { COLORS, STATUS_COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Linking } from 'react-native'
import { Buffer } from 'buffer'

const METHODS = ['cash', 'bank_transfer', 'cheque', 'upi', 'other']
const METHOD_ICONS = { cash: '💵', bank_transfer: '🏦', cheque: '📝', upi: '📱', other: '💳' }

export default function InvoiceDetailScreen({ route }) {
  const { id } = route.params
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference_number: '', payment_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const { data } = await invoiceAPI.get(id)
      setInvoice(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleMarkSent = async () => {
    await invoiceAPI.markSent(id)
    load()
  }

  const handleCancel = () => {
    Alert.alert('Cancel Invoice', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => { await invoiceAPI.cancel(id); load() } }
    ])
  }

  const handleAddPayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    setSaving(true)
    try {
      await paymentAPI.create({ ...payForm, invoice: parseInt(id) })
      setPayModal(false)
      setPayForm({ amount: '', payment_method: 'cash', reference_number: '', payment_date: new Date().toISOString().split('T')[0] })
      load()
    } catch { Alert.alert('Error', 'Failed to record payment') }
    finally { setSaving(false) }
  }

  const handleDeletePayment = (pid) => {
    Alert.alert('Delete Payment', 'Delete this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await paymentAPI.delete(pid); load() } }
    ])
  }


const handlePDF = async (id) => {
  const res = await invoiceAPI.pdf(id)

  const base64 = Buffer.from(res.data, 'binary').toString('base64')

  const fileUri = FileSystem.documentDirectory + `invoice_${id}.pdf`

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })

  await Sharing.shareAsync(fileUri)
}

const handleShare = (inv) => {
  const msg = `Invoice ${inv.invoice_number}
Amount: ${fmt(inv.total_amount)}
Due: ${inv.due_date}`

  const url = `https://wa.me/${inv.customer_phone}?text=${encodeURIComponent(msg)}`
  Linking.openURL(url)
}

  if (loading) return <LoadingScreen />
  if (!invoice) return <View style={{ flex: 1 }}><Text>Not found</Text></View>

  const badge = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft
  const progress = invoice.total_amount > 0
    ? Math.min((invoice.amount_paid / invoice.total_amount) * 100, 100)
    : 0

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
      >
        {/* Invoice Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
            <Badge label={badge.label} bg={badge.bg} color={badge.color} />
          </View>
          <Text style={styles.customerName}>{invoice.customer_name}</Text>
          {invoice.customer_phone ? <Text style={styles.customerInfo}>{invoice.customer_phone}</Text> : null}
          {invoice.customer_address ? <Text style={styles.customerInfo}>{invoice.customer_address}</Text> : null}

          <View style={styles.dateRow}>
            <Text style={styles.dateText}>📅 Issued: <Text style={{ fontWeight: '600' }}>{invoice.issue_date}</Text></Text>
            <Text style={[styles.dateText, invoice.is_overdue && { color: COLORS.danger }]}>
              ⏰ Due: <Text style={{ fontWeight: '600' }}>{invoice.due_date}</Text>
              {invoice.is_overdue ? ` (${invoice.days_overdue}d late)` : ''}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Payment Progress</Text>
              <Text style={styles.progressPct}>{progress.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress >= 100 ? COLORS.primaryLight : COLORS.warning }]} />
            </View>
          </View>
        </View>

        {/* Amounts */}
        <View style={styles.amountsCard}>
          {[
            ['Subtotal', fmt(invoice.subtotal), null],
            [`Tax (${invoice.tax_rate}%)`, fmt(invoice.tax_amount), null],
            ['Discount', fmt(invoice.discount), null],
            ['Total', fmt(invoice.total_amount), { fontWeight: '700', fontSize: 16, color: COLORS.text }],
            ['Paid', fmt(invoice.amount_paid), { color: COLORS.primaryLight, fontWeight: '700' }],
            ['Balance Due', fmt(invoice.balance_due), { color: invoice.balance_due > 0 ? COLORS.danger : COLORS.primaryLight, fontWeight: '800', fontSize: 16 }],
          ].map(([label, value, valueStyle]) => (
            <View key={label} style={styles.amountRow}>
              <Text style={styles.amountLabel}>{label}</Text>
              <Text style={[styles.amountValue, valueStyle]}>{value}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' }}>
  
           <TouchableOpacity onPress={() => handleDownloadPDF(inv.id)}>
           <Text style={{ color: COLORS.primary }}>PDF</Text>
           </TouchableOpacity>

           <TouchableOpacity onPress={() => handleShare(inv)}>
           <Text style={{ color: COLORS.info }}>Share</Text>
          </TouchableOpacity>

        </View>

        {/* Items */}
        {invoice.items?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            {invoice.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  <Text style={styles.itemDetail}>{item.quantity} {item.unit} × {fmt(item.unit_price)}</Text>
                </View>
                <Text style={styles.itemTotal}>{fmt(parseFloat(item.quantity) * parseFloat(item.unit_price))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {!invoice.payments || invoice.payments.length === 0 ? (
            <Text style={styles.noPayments}>No payments recorded yet</Text>
          ) : (
            invoice.payments.map(p => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.paymentIcon}>{METHOD_ICONS[p.payment_method] || '💳'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentMethod}>{p.payment_method_display || p.payment_method}</Text>
                  <Text style={styles.paymentDate}>{p.payment_date}{p.reference_number ? ` · ${p.reference_number}` : ''}</Text>
                </View>
                <Text style={styles.paymentAmount}>{fmt(p.amount)}</Text>
                <TouchableOpacity onPress={() => handleDeletePayment(p.id)} style={{ marginLeft: 8 }}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {invoice.status === 'draft' && (
          <Button title="Mark Sent" onPress={handleMarkSent} color={COLORS.info} style={{ flex: 1, marginRight: 8 }} />
        )}
        {!['paid', 'cancelled'].includes(invoice.status) && invoice.balance_due > 0 && (
          <Button title="+ Payment" onPress={() => setPayModal(true)} style={{ flex: 1, marginRight: 8 }} />
        )}
        {!['paid', 'cancelled'].includes(invoice.status) && (
          <Button title="Cancel" onPress={handleCancel} color={COLORS.danger} outlined style={{ flex: 1 }} />
        )}
      </View>

      {/* Payment Modal */}
      <Modal visible={payModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Record Payment</Text>
          <TouchableOpacity onPress={() => setPayModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>{fmt(invoice.balance_due)}</Text>
          </View>

          <Input label="Amount (₹) *" value={payForm.amount} onChangeText={v => setPayForm(f => ({ ...f, amount: v }))} keyboardType="decimal-pad" placeholder="0.00" />

          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.methodGrid}>
            {METHODS.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setPayForm(f => ({ ...f, payment_method: m }))}
                style={[styles.methodBtn, payForm.payment_method === m && styles.methodBtnActive]}
              >
                <Text style={styles.methodIcon}>{METHOD_ICONS[m]}</Text>
                <Text style={[styles.methodLabel, payForm.payment_method === m && { color: COLORS.primary, fontWeight: '700' }]}>
                  {m.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Payment Date" value={payForm.payment_date} onChangeText={v => setPayForm(f => ({ ...f, payment_date: v }))} placeholder="YYYY-MM-DD" />
          <Input label="Reference No." value={payForm.reference_number} onChangeText={v => setPayForm(f => ({ ...f, reference_number: v }))} placeholder="Cheque/UPI ref..." />

          <Button title={saving ? 'Saving...' : 'Record Payment'} onPress={handleAddPayment} loading={saving} style={{ marginBottom: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  headerCard: { backgroundColor: '#fff', padding: 16, margin: 12, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  customerName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  customerInfo: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  dateRow: { marginTop: 10, gap: 4 },
  dateText: { fontSize: 12, color: COLORS.textMuted },
  progressSection: { marginTop: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: COLORS.textMuted },
  progressPct: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  progressBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  amountsCard: { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  amountLabel: { fontSize: 13, color: COLORS.textMuted },
  amountValue: { fontSize: 13, color: COLORS.text },
  section: { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  itemDesc: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  itemDetail: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  noPayments: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  paymentIcon: { fontSize: 18, marginRight: 10 },
  paymentMethod: { fontSize: 13, fontWeight: '500', color: COLORS.text, textTransform: 'capitalize' },
  paymentDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  paymentAmount: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },
  notesText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  actionBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border, elevation: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
  balanceBox: { backgroundColor: COLORS.primaryPale, borderRadius: 10, padding: 14, marginBottom: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: COLORS.textMuted },
  balanceValue: { fontSize: 22, fontWeight: '800', color: COLORS.danger, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 8 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: 'transparent', alignItems: 'center', minWidth: 80 },
  methodBtnActive: { backgroundColor: COLORS.primaryPale, borderColor: COLORS.primaryLight },
  methodIcon: { fontSize: 18, marginBottom: 2 },
  methodLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
})
