import { ExternalLink } from "lucide-react";
import { LeHeader } from "@/components/admin/lead-engine/tabs";

/**
 * People who are asking for help right now. These platforms don't allow automated
 * collection, so instead of scraping we open ready-made searches you read and answer yourself.
 */
const g = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=qdr:w`;

const GROUPS: { title: string; why: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Reddit — owners asking for help",
    why: "Answer helpfully in the thread first; offer the free first project only if they ask.",
    links: [
      { label: "“need a website” (last week)", href: g('site:reddit.com "need a website" small business') },
      { label: "“recommend a web designer”", href: g('site:reddit.com "recommend" "web designer" OR "web developer" business') },
      { label: "“marketing agency” complaints", href: g('site:reddit.com "marketing agency" "waste of money" OR "scammed" small business') },
      { label: "“how do I get more customers”", href: g('site:reddit.com "how do i get more customers" OR "how to get more clients" business') },
      { label: "r/forhire — [Hiring] web / marketing", href: "https://www.reddit.com/r/forhire/search/?q=%5BHiring%5D%20website&restrict_sr=1&sort=new" },
      { label: "r/smallbusiness — newest", href: "https://www.reddit.com/r/smallbusiness/new/" },
    ],
  },
  {
    title: "Facebook groups & posts",
    why: "Local business groups are full of “who can build my site / run my ads?” posts.",
    links: [
      { label: "Groups: small business owners", href: "https://www.facebook.com/groups/search/groups/?q=small%20business%20owners" },
      { label: "Posts: “looking for a web designer”", href: "https://www.facebook.com/search/posts/?q=looking%20for%20a%20web%20designer" },
      { label: "Posts: “need someone to run my ads”", href: "https://www.facebook.com/search/posts/?q=need%20someone%20to%20run%20facebook%20ads" },
      { label: "Ad Library — who's advertising (US)", href: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=all" },
    ],
  },
  {
    title: "X (Twitter), LinkedIn & forums",
    why: "Founders post when they need help; reply with something useful.",
    links: [
      { label: "X: “need a website for my business”", href: "https://x.com/search?q=%22need%20a%20website%22%20business&f=live" },
      { label: "X: “looking for a video editor”", href: "https://x.com/search?q=%22looking%20for%20a%20video%20editor%22&f=live" },
      { label: "LinkedIn posts: “looking for a web developer”", href: "https://www.linkedin.com/search/results/content/?keywords=%22looking%20for%20a%20web%20developer%22&sortBy=%22date_posted%22" },
      { label: "Indie Hackers / forums (Google)", href: g('"looking for" "developer" OR "designer" site:indiehackers.com') },
    ],
  },
  {
    title: "Job boards & gigs (they already have budget)",
    why: "A company hiring a marketer or web developer will often take a done-for-you offer.",
    links: [
      { label: "Upwork: website jobs (US clients)", href: "https://www.upwork.com/nx/search/jobs/?q=website%20small%20business&sort=recency" },
      { label: "Craigslist gigs: computer (search)", href: g('site:craigslist.org "website" gigs computer') },
      { label: "Indeed: “marketing coordinator” small business", href: "https://www.indeed.com/jobs?q=marketing+coordinator+small+business&sort=date" },
      { label: "Google Ads Transparency — advertisers", href: "https://adstransparency.google.com/?region=US" },
    ],
  },
];

export default function LeIntentPage() {
  return (
    <div className="space-y-6">
      <LeHeader
        active="/admin/lead-engine/intent"
        title="Intent search"
        intro="People asking for help right now. These sites don't allow bots, so nothing here is scraped — open a search, read, and reply like a person. Good finds can be added to Leads by hand."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {GROUPS.map((grp) => (
          <section key={grp.title} className="card p-5">
            <h2 className="font-semibold">{grp.title}</h2>
            <p className="mt-1 text-sm text-muted">{grp.why}</p>
            <ul className="mt-4 space-y-2">
              {grp.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-paper">
                    {l.label} <ExternalLink className="size-3.5 shrink-0 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
