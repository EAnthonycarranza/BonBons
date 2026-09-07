import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Our story",
  description:
    "Meet Bonnie Gazmez, the creator of Bon Bon's Sweets & More, and her supporting husband Greg Gamez. A cake pop business rooted in family, love, and Christian faith.",
};

export default function AboutPage() {
  return (
    <>
      <section className="wrap story-hero">
        <div className="story-hero-copy rv-anim">
          <div className="eyebrow lined-label">
            The heart behind Bon Bon&apos;s
          </div>
          <h1>
            A little faith.
            <br />A lot of <em>heart.</em>
          </h1>
          <p>
            Meet Bonnie Gazmez—the baker, believer, and creator behind Bon
            Bon&apos;s Sweets &amp; More.
          </p>
          <p>
            A lifelong love of baking, the encouragement of her husband Greg
            Gamez, and a God-given gift. That is where our story begins.
          </p>
          <a className="text-link" href="#our-story">
            Come into our kitchen <span aria-hidden="true">↓</span>
          </a>
        </div>
        <figure className="story-portrait rv-anim">
          <Image
            src="/images/bonnie-and-greg.jpg"
            alt="Bonnie and her supporting husband Greg Gamez"
            width={570}
            height={696}
            priority
            sizes="(max-width: 760px) 100vw, 45vw"
          />
          <figcaption>
            <span>Bonnie &amp; Greg</span>
            <small>Family. Faith. Something sweet.</small>
          </figcaption>
        </figure>
      </section>
      <section className="sec story-chapter" id="our-story">
        <div className="wrap story-chapter-grid rv-anim">
          <div>
            <div className="eyebrow">01 / How it started</div>
            <h2>
              Always baking.
              <br />
              <em>Always sharing.</em>
            </h2>
          </div>
          <div className="story-prose">
            <p>
              For Bonnie, baking has always been about the people she loves.
              Long before Bon Bon&apos;s, she was making sweet treats for her
              family and friends—finding joy in something homemade and the
              smiles that followed.
            </p>
            <p>
              One day, she decided to turn those God-given gifts into a cake pop
              business. Bon Bon&apos;s Sweets &amp; More grew from that simple
              step: sharing what she loves with a few more people.
            </p>
          </div>
        </div>
      </section>
      <section className="faith-editorial">
        <div className="wrap rv-anim">
          <div className="eyebrow">02 / What guides her</div>
          <h2>
            Faith is not just part of the story.
            <br />
            <em>It is at the heart of it.</em>
          </h2>
          <p>
            Bonnie&apos;s Christian faith is a big part of who she is. She sees
            her creativity and love for baking as gifts from God, and Bon
            Bon&apos;s is a way to put those gifts to work with gratitude, care,
            and love for others.
          </p>
          <div className="faith-rule" aria-hidden="true" />
        </div>
      </section>
      <section className="sec">
        <div className="wrap story-support rv-anim">
          <div className="story-support-photo">
            <Image
              src="/products/bonbons-real-gift-box.jpg"
              alt="Bonnie’s wrapped cake pops nestled in a gift box with blue paper filling"
              fill
              sizes="(max-width: 760px) 100vw, 45vw"
            />
          </div>
          <div>
            <div className="eyebrow">03 / Better together</div>
            <h2>
              A dream with
              <br />
              <em>Greg by her side.</em>
            </h2>
            <p>
              Behind Bonnie is her supporting husband, Greg Gamez. His
              encouragement is an important part of her journey, and together
              they bring the warmth of family to Bon Bon&apos;s.
            </p>
            <p>
              Today, cake pops are our specialty. A little treat for yourself,
              four to share, or something special for a celebration—each begins
              with that same love of making someone&apos;s day.
            </p>
            <Link className="text-link" href="/shop">
              Find a little joy of your own <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="wrap closing-note rv-anim">
        <div className="eyebrow">From our family to you</div>
        <h2>
          Thanks for being part
          <br />
          of our <em>sweet beginning.</em>
        </h2>
        <div className="editorial-actions">
          <Link className="btn btn-pink" href="/shop">
            Shop cake pops <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/quote">
            Have something special in mind? →
          </Link>
        </div>
      </section>
    </>
  );
}
