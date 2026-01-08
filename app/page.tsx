export default function Home() {
  return (
    <main className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Welcome to Sacred Heart Youth Group</h1>
        <p className="muted">
          This is the public hub for teens and families. We will build out events, weekly challenges, and prayer
          requests next.
        </p>
        <p>
          Ready to join? Start with the teen registration form so we can collect contact info and begin parent
          verification.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Upcoming Events</h2>
          <p className="muted">Event listings will appear here as they are created by admin staff.</p>
        </article>
        <article className="card">
          <h2>Mass &amp; Confession Schedule</h2>
          <p className="muted">We will wire this up to your schedule data soon.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Weekly Challenge</h2>
          <p className="muted">Challenges will surface here once the weekly challenge manager is ready.</p>
        </article>
        <article className="card">
          <h2>Prayer Requests</h2>
          <p className="muted">Teens will be able to submit prayers (anonymous optional). We will add email alerts.</p>
        </article>
      </section>
    </main>
  );
}
