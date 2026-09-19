import { Camera, Check } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/useAccount'
import { SettingsLayout } from '../../layout/SettingsLayout'

export function ProfilePage() {
  const { user, updateUser } = useAccount()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState('+254 712 345 678')
  const [country, setCountry] = useState('Kenya')
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateUser({ name })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SettingsLayout>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Profile Details</h2>
        <span className="rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-semibold text-teal">
          Tier 1 Verified
        </span>
      </div>
      <p className="mb-6 text-xs text-muted">Update your personal account information</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-dark to-panel-light text-2xl font-bold text-text shadow-lg">
              {name[0]?.toUpperCase() || 'U'}
            </span>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-teal text-bg shadow hover:brightness-110"
              title="Change Avatar"
            >
              <Camera size={14} />
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Full Legal Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-light px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Email Address</span>
            <input
              value={user.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-line bg-panel-light/60 px-3 py-2.5 text-sm font-semibold text-muted outline-none"
            />
            <span className="mt-1 block text-[11px] text-muted">Email cannot be changed after registration.</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Phone Number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-line bg-panel-light px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Country of Residence</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-line bg-panel-light px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-dark to-teal py-2.5 text-sm font-bold text-bg hover:brightness-110 shadow-lg shadow-teal/20"
        >
          {saved ? (
            <>
              <Check size={16} /> Changes Saved
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>
    </SettingsLayout>
  )
}

export default ProfilePage
