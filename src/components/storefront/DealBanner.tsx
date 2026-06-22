import Link from "next/link";
import Image from "next/image";

interface DealBannerProps {
  title: string;
  subtitle: string;
  linkText: string;
  linkUrl: string;
  imageUrl?: string;
  gradient?: string;
}

export default function DealBanner({
  title, // eslint-disable-line no-unused-vars
  subtitle, // eslint-disable-line no-unused-vars
  linkText, // eslint-disable-line no-unused-vars
  linkUrl,
  imageUrl,
  gradient = "from-zinc-900 via-zinc-800 to-zinc-950"
}: DealBannerProps) {
  const content = (
    <div data-nosnippet className={`relative overflow-hidden aspect-[3/1] w-full bg-gradient-to-r ${gradient}`}>

      {/* Background Image Strategy (Full Card Background Cover) */}
      {imageUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        </div>
      )}
    </div>
  );

  if (linkUrl) {
    return <Link href={linkUrl} className="block w-full cursor-pointer">{content}</Link>;
  }

  return content;
}



