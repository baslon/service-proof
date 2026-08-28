import LegalLayout, { NotPublishedYet } from '../components/LegalLayout'
import { COMPANY } from '../lib/company'

// Intentionally not written as policy text. Drafting a privacy notice is a
// legal exercise, not a copywriting one, and inventing plausible-sounding
// clauses here would create something a customer might rely on. What this
// page does instead is state honestly that it isn't ready, and set out what
// the real document has to cover — which is a useful brief for whoever
// drafts it.
export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <NotPublishedYet>
        {COMPANY.legalName} is preparing its privacy notice. Until it is published, contact{' '}
        <a href={`mailto:${COMPANY.contactEmail}`} className="underline">
          {COMPANY.contactEmail}
        </a>{' '}
        with any question about how personal data is handled.
      </NotPublishedYet>

      <div>
        <h2 className="text-base font-semibold text-zinc-900">What the published notice will need to cover</h2>
        <p className="mt-2">
          {COMPANY.product} records proof that cleaning work has been carried out. Doing so involves personal
          data, so under UK GDPR the notice must set out at least the following.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-zinc-800">What is collected.</strong> Names and email addresses
            of managers and operatives; client contact names, emails and phone numbers; photographs taken at
            client premises, with the times they were captured and who submitted them.
          </li>
          <li>
            <strong className="font-medium text-zinc-800">Why, and on what lawful basis.</strong> Typically
            contract performance for account holders and legitimate interests for evidence of service delivery
            — stated explicitly rather than assumed.
          </li>
          <li>
            <strong className="font-medium text-zinc-800">Who it is shared with.</strong> Sub-processors used to
            run the service, including hosting, database and email providers, and the countries they operate in.
          </li>
          <li>
            <strong className="font-medium text-zinc-800">How long it is kept.</strong> Evidence of a completed
            job is deliberately immutable once submitted, so retention needs stating clearly — including what
            happens to a customer&rsquo;s records if they stop using the service.
          </li>
          <li>
            <strong className="font-medium text-zinc-800">Individual rights.</strong> Access, rectification,
            erasure, objection, and how to exercise them — alongside an honest account of how erasure interacts
            with records that cannot be altered after the fact.
          </li>
          <li>
            <strong className="font-medium text-zinc-800">Complaints.</strong> The right to complain to the
            Information Commissioner&rsquo;s Office.
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900">Also needed for business customers</h2>
        <p className="mt-2">
          Where a cleaning company uses {COMPANY.product} to record work by its own staff, that company is the
          data controller and {COMPANY.legalName} is a processor acting on its instructions. A data processing
          agreement covering that relationship will usually be required before a customer signs.
        </p>
      </div>
    </LegalLayout>
  )
}
