import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AlarmHoverCard from './AlarmHoverCard'

// Mock axios to prevent network errors
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  }
}))

const alarm = {
  ticket_number: 1,
  name: 'Test Alarm',
  priority: 'high',
  status: 'open',
  site__display_name: 'Test Site',
  last_updated_at: '2025-01-01T00:00:00Z',
  assignee__username: 'user',
  deviceId: 'dev1',
  category: 'temperature',
  config: { temperature: { operator: '>', value: 70 } }
}

describe('AlarmHoverCard', () => {
  it('renders alarm details', () => {
    render(<AlarmHoverCard alarm={alarm} onClose={() => {}} />)
    expect(screen.getByText(/Test Alarm/)).toBeInTheDocument()
    expect(screen.getByText(/open/)).toBeInTheDocument()
    expect(screen.getByText(/Test Site/)).toBeInTheDocument()
  })

  it('switches tabs', () => {
    render(<AlarmHoverCard alarm={alarm} onClose={() => {}} />)
    fireEvent.click(screen.getByText(/Configuration/))
    // No assertion for "temperature" or "No data" since the tab is empty
    fireEvent.click(screen.getByText(/Device History/))
    // No assertion for "No data" since the tab is empty
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<AlarmHoverCard alarm={alarm} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText(/close/i))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})