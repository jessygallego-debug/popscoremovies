import BrandHomeLink from "@/app/components/brand-home-link";
import ProfileEditor from "@/app/components/profile-editor";

export default function EditProfilePage() {
  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#020617_0%,#000_50%,#020617_100%)] px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-6xl">
        <BrandHomeLink />
        <div className="mt-10">
          <ProfileEditor />
        </div>
      </section>
    </main>
  );
}
