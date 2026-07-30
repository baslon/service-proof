import LegalLayout, { NotPublishedYet } from '../components/LegalLayout'
import { COMPANY } from '../lib/company'

// As with the privacy notice: a scaffold, not invented contract terms.
export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <NotPublishedYet>
        {COMPANY.legalName} is preparing its terms of service. Until they are published, the terms of any pilot
        or subscription are whatever has been agreed in writing directly.
      </NotPublishedYet>

      <div>
        <h2 className="text-base font-semibold text-slate-900">What the published terms will need to cover</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-slate-800">The service and who provides it.</strong>{' '}
            {COMPANY.product}, operated by {COMPANY.legalName}, registered in {COMPANY.registeredIn} no.{' '}
            {COMPANY.registrationNumber}.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Charges.</strong> What a pilot includes, what happens
            at its end, the per-site fee, billing period, VAT treatment, and notice required to cancel.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Ownership of records.</strong> Who owns the evidence a
            customer&rsquo;s operatives submit, and what they are entitled to export.
          </li>
          <li>
            <strong className="font-medium text-slate-800">What happens on termination.</strong> How long records
            remain available and how they can be retrieved. This matters more here than in most products,
            because the value of the service is a record a customer may later need to rely on.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Availability and liability.</strong> What is promised
            about uptime, and the limits of liability — including the position where evidence is lost or a
            report is disputed.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Acceptable use.</strong> Responsibility for the
            accuracy of submitted evidence, and for what is photographed on a client&rsquo;s premises.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Governing law.</strong> Jurisdiction and how disputes
            are handled.
          </li>
        </ul>
      </div>
    </LegalLayout>
  )
}
