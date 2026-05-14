import BrandHomeLink from "@/app/components/brand-home-link";
import ProfileEditor from "@/app/components/profile-editor";
import Link from "next/link";

export default function EditProfilePage() {
  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#020617_0%,#000_50%,#020617_100%)] px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <BrandHomeLink />
          <Link
            href="/"
            aria-label="Exit sign in screen"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-gray-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            X
          </Link>
        </div>
        <div className="mt-10">
          <ProfileEditor />
        </div>
      </section>
    </main>
  );
}
