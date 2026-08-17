import BoxBuilder from "@/components/BoxBuilder";

export const metadata = {
  title: "Build a box",
  description: "Mix your own box of treats. Pick a size, choose your treats, see the price update as you build.",
};

export default function BuildABoxPage() {
  return (
    <section className="light flat">
      <div className="wrap sec">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Build a box</div>
            <h2>Mix your own, price as you go</h2>
            <p>Pick a box size, then choose your treats. The total updates as you build.</p>
          </div>
        </div>
        <BoxBuilder />
      </div>
    </section>
  );
}
