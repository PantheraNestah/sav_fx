import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  IdCard,
  Lock,
  ScanFace,
  Upload,
  UserCheck,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../context/useToast'
import { SettingsLayout } from '../../layout/SettingsLayout'

const BENEFITS = [
  { icon: Check, label: 'Higher withdrawal limits ($50,000/day)' },
  { icon: Zap, label: 'Instant automated M-Pesa payouts' },
  { icon: IdCard, label: 'Access to real strategy provider program' },
  { icon: Lock, label: 'Enhanced account security and AML clearance' },
]

export function VerifyIdentityPage() {
  const { showToast } = useToast()
  const [frontFile, setFrontFile] = useState<string | null>(null)
  const [backFile, setBackFile] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleFileChange(
    type: 'front' | 'back' | 'selfie',
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'front') setFrontFile(file.name)
      if (type === 'back') setBackFile(file.name)
      if (type === 'selfie') setSelfieFile(file.name)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!frontFile || !selfieFile) {
      showToast({
        title: 'Missing Documents',
        message: 'Please attach at least your ID Front and a Selfie.',
        type: 'warning',
      })
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
      showToast({
        title: 'Documents Submitted for Verification',
        message: 'Our compliance team typically reviews KYC within 15 minutes.',
        type: 'success',
      })
    }, 1800)
  }

  return (
    <SettingsLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/15 text-teal">
            <UserCheck size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold">Verify Identity (KYC)</h2>
            <p className="text-xs text-muted">Complete document verification for full platform access</p>
          </div>
        </div>

        {submitted && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 animate-pulse">
            <Clock size={13} /> Under Review
          </span>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-panel-light p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal">Verification Benefits</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <span key={b.label} className="flex items-center gap-2 text-xs text-muted">
              <b.icon size={14} className="shrink-0 text-teal" />
              <span className="text-text font-medium">{b.label}</span>
            </span>
          ))}
        </div>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-6 text-center animate-in zoom-in-95">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal/20 text-teal">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-bold text-text">KYC Submission Received</h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            Your National ID and liveness biometric verification are being processed. You will be notified via email once approved.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Front Upload */}
            <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
              frontFile ? 'border-teal bg-teal/10' : 'border-line hover:border-teal/50 bg-panel-light'
            }`}>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange('front', e)} className="hidden" />
              <IdCard size={28} className={frontFile ? 'text-teal' : 'text-muted'} />
              <span className="text-xs font-bold">{frontFile ? frontFile : 'ID Front'}</span>
              <span className="text-[10px] text-muted">National ID or Passport</span>
            </label>

            {/* Back Upload */}
            <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
              backFile ? 'border-teal bg-teal/10' : 'border-line hover:border-teal/50 bg-panel-light'
            }`}>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange('back', e)} className="hidden" />
              <ScanFace size={28} className={backFile ? 'text-teal' : 'text-muted'} />
              <span className="text-xs font-bold">{backFile ? backFile : 'ID Back (Optional)'}</span>
              <span className="text-[10px] text-muted">Reverse side of card</span>
            </label>

            {/* Selfie Upload */}
            <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
              selfieFile ? 'border-teal bg-teal/10' : 'border-line hover:border-teal/50 bg-panel-light'
            }`}>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange('selfie', e)} className="hidden" />
              <Camera size={28} className={selfieFile ? 'text-teal' : 'text-muted'} />
              <span className="text-xs font-bold">{selfieFile ? selfieFile : 'Liveness Selfie'}</span>
              <span className="text-[10px] text-muted">Face clearly visible</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-dark to-teal py-3 text-sm font-bold text-bg hover:brightness-110 shadow-lg shadow-teal/20"
          >
            <Upload size={16} />
            {isSubmitting ? 'Uploading Documents...' : 'Submit Documents for Verification'}
          </button>
        </form>
      )}
    </SettingsLayout>
  )
}

export default VerifyIdentityPage
