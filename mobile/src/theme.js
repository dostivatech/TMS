export const COLORS = {
  primary: '#1a6b3a',
  primaryLight: '#2d9d5f',
  primaryPale: '#e8f5e9',
  danger: '#d32f2f',
  dangerPale: '#ffebee',
  warning: '#f57c00',
  warningPale: '#fff3e0',
  info: '#1565c0',
  infoPale: '#e3f2fd',
  text: '#1a1a1a',
  textMuted: '#666666',
  textLight: '#999999',
  border: '#e0e0e0',
  bg: '#f0f4f0',
  card: '#ffffff',
  white: '#ffffff',
}

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
}

export const STATUS_COLORS = {
  paid:      { bg: '#e8f5e9', color: '#2d9d5f', label: 'Paid' },
  overdue:   { bg: '#ffebee', color: '#d32f2f', label: 'Overdue' },
  partial:   { bg: '#fff3e0', color: '#f57c00', label: 'Partial' },
  sent:      { bg: '#e3f2fd', color: '#1565c0', label: 'Sent' },
  draft:     { bg: '#f5f5f5', color: '#666666', label: 'Draft' },
  cancelled: { bg: '#f5f5f5', color: '#999999', label: 'Cancelled' },
}
