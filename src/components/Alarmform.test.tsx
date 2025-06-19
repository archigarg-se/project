import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AlarmForm from './AlarmForm'

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: {} })),
  }
}))

// Mock fetch
beforeAll(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ alarm: true })),
    })
  ) as any
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('AlarmForm', () => {
  const config = { temperature: { operator: '>', value: 70 }, humidity: { operator: '>', value: 90 } }

  it('renders form title', () => {
    render(<AlarmForm onClose={() => {}} onSuccess={() => {}} config={config} />)
    expect(screen.getByText(/Simulate Telemetry/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AlarmForm onClose={onClose} onSuccess={() => {}} config={config} />)
    fireEvent.click(screen.getByText(/Cancel/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation errors if required fields are empty', async () => {
    render(<AlarmForm onClose={() => {}} onSuccess={() => {}} config={config} />)
    fireEvent.click(screen.getByText(/Save/i))
    await waitFor(() => {
      expect(screen.getByText(/Simulate Telemetry/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const onSuccess = vi.fn()
    render(<AlarmForm onClose={() => {}} onSuccess={onSuccess} config={config} />)
    fireEvent.change(screen.getByPlaceholderText(/Device ID/i), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByPlaceholderText(/Site Display Name/i), { target: { value: 'Test Site' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'temperature' } })
    fireEvent.change(screen.getByPlaceholderText(/Value/i), { target: { value: '75' } })
    fireEvent.change(screen.getByPlaceholderText(/Timestamp/i), { target: { value: '2025-01-01T00:00' } })
    fireEvent.click(screen.getByText(/Save/i))
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})