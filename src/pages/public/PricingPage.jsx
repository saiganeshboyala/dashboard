import { Link } from 'react-router-dom'
import { Check, Briefcase } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'For small teams getting started',
    features: ['5 users', '1,000 records', 'Basic CRM', 'Email templates', 'Standard support'],
    cta: 'Start Free',
    color: 'border-gray-200',
  },
  {
    name: 'Starter',
    price: '₹2,499',
    period: '/mo',
    description: 'For growing recruitment teams',
    features: ['25 users', '10,000 records', 'Analytics dashboard', 'Bulk operations', 'CSV import/export', 'Email support'],
    cta: 'Get Started',
    color: 'border-gray-200',
  },
  {
    name: 'Pro',
    price: '₹6,499',
    period: '/mo',
    description: 'For established agencies',
    features: ['100 users', 'Unlimited records', 'AI Agents', 'Flow automation', 'Validation rules', 'Audit trail', 'Priority support'],
    cta: 'Start Pro Trial',
    color: 'border-brand-500',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹16,499',
    period: '/mo',
    description: 'For large organizations',
    features: ['Unlimited users', 'Custom objects', 'SSO & MFA', 'Dedicated support', 'Custom domain', 'SLA guarantee', 'On-prem option'],
    cta: 'Contact Sales',
    color: 'border-gray-200',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Briefcase size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-[14px]">Fyxo CRM</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login"    className="text-[13px] text-gray-400 hover:text-white transition-colors">Sign In</Link>
          <Link to="/register" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-medium rounded-lg transition-all">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center py-20 px-4">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">Start free. Scale as you grow. No hidden fees.</p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <div key={plan.name}
              className={`relative bg-white/5 border-2 ${plan.color} rounded-2xl p-6 flex flex-col ${plan.popular ? 'ring-2 ring-brand-500/30' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">Most Popular</span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-[15px] font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-[12px] text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-[12px] text-gray-500">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[12.5px] text-gray-400">
                    <Check size={13} className="text-brand-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register"
                className={`block text-center py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  plan.popular
                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-gray-600 mt-10">
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
