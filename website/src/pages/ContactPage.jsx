import { Section, SectionHeader, Button } from '../components/UI';

export default function ContactPage() {
  return (
    <Section>
      <SectionHeader
        title="Let's Build the Future of Agriculture Together"
        subtitle="Have a question, partnership opportunity, or want to get in touch? We'd love to hear from you."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 40 }}>
        <div>
          <h3 style={{ fontSize: 22, marginBottom: 20 }}>Company Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15, color: 'var(--gray)' }}>
            <div>
              <strong style={{ color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Company</strong>
              V4V Agritech Solutions Ltd — RC: 9673943
            </div>
            <div>
              <strong style={{ color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Address</strong>
              RSQ 049, Pipeline Close, Kamazou, Kaduna State, Nigeria
            </div>
            <div>
              <strong style={{ color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Email</strong>
              phillip.makama@v4vagritech.com
            </div>
            <div>
              <strong style={{ color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Phone / WhatsApp</strong>
              +234 810 252 9947
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Button variant="primary" href="https://wa.me/2348102529947">Chat on WhatsApp</Button>
          </div>
        </div>

        <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h3 style={{ fontSize: 22, marginBottom: 20 }}>Send us a message</h3>
          <form onSubmit={(e) => { e.preventDefault(); alert('Message received! We will get back to you shortly.'); }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Name</label>
                <input type="text" required style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Organization</label>
                <input type="text" style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Role</label>
                <select style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)', background: 'var(--white)' }}>
                  <option>Farmer</option>
                  <option>Cooperative Leader</option>
                  <option>Lender / Bank</option>
                  <option>Input Supplier</option>
                  <option>Offtaker</option>
                  <option>Technical Partner</option>
                  <option>Investor</option>
                  <option>BDSP</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Message</label>
                <textarea required rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }} />
              </div>
              <Button type="submit" variant="primary">Send Message</Button>
            </div>
          </form>
        </div>
      </div>

      {/* Map placeholder */}
      <div style={{
        marginTop: 48, height: 300, background: 'var(--off-white)',
        borderRadius: 'var(--radius-lg)', display: 'grid', placeItems: 'center',
        color: 'var(--gray)', fontSize: 14,
      }}>
        Google Map — Kaduna State, Nigeria
      </div>
    </Section>
  );
}
