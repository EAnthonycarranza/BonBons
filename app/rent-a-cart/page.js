import RentCartForm, { RentCartAside } from "@/components/RentCartForm";
import { CART_PARTY_SIZES } from "@/lib/cart-rental";

export const metadata = {
  title: "Rent the cake-pop cart for your event",
  description:
    "Bring Bon Bon's cake-pop cart to your party, shower, wedding or work event. Tell us the date, the event and your guest count, and Bonnie will quote you.",
};

export default function RentACartPage() {
  const biggest = CART_PARTY_SIZES.at(-1);
  return (
    <section className="light flat sec">
      <div className="wrap">
        <div className="sec-top rv-anim">
          <div>
            <div className="eyebrow">Rent a cart</div>
            <h1>
              Bring the cake-pop cart
              <br />
              to <em>your event.</em>
            </h1>
            <p>
              A little cart, stocked with hand-made cake pops in your colors.
              Tell us when, what the occasion is, and about how many guests, and
              Bonnie will get in touch to confirm flavors and price, then plan the
              cart with you. It seats a small crowd — up to {biggest.max} guests.
            </p>
          </div>
        </div>
        <div className="form-wrap">
          <RentCartForm />
          <RentCartAside />
        </div>
      </div>
    </section>
  );
}
