import { ImageResponse } from "next/og";

export const alt = "EmberChamber";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at top, rgba(255,174,120,0.22), transparent 30%), linear-gradient(135deg, #120a0b, #241311 58%, #51231b)",
        color: "#f8ede7",
        padding: "56px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "26px",
          borderRadius: "36px",
          border: "1px solid rgba(255,221,196,0.18)",
        }}
      />
      <div
        style={{
          width: "170px",
          height: "170px",
          borderRadius: "42px",
          background: "linear-gradient(160deg, #2b1713, #140c0d)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255,220,191,0.12)",
        }}
      >
        <div
          style={{
            width: "82px",
            height: "110px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "28px 28px 22px 22px",
            border: "7px solid #ffb579",
            boxShadow: "inset 0 0 0 4px rgba(255,205,167,0.16)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "19px",
              top: "26px",
              width: "30px",
              height: "46px",
              background: "linear-gradient(180deg, #ffd59a, #e15e32)",
              clipPath:
                "polygon(50% 0%, 70% 30%, 100% 60%, 74% 100%, 28% 78%, 0% 100%, 18% 58%, 34% 28%)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: "44px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "22px",
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: "#e3a785",
          }}
        >
          Invite-only encrypted messaging
        </div>
        <div
          style={{
            marginTop: "26px",
            fontSize: "72px",
            fontWeight: 700,
            letterSpacing: "-0.06em",
          }}
        >
          EmberChamber
        </div>
        <div
          style={{
            marginTop: "18px",
            fontSize: "30px",
            maxWidth: "760px",
            lineHeight: 1.3,
            color: "#f3d8c8",
          }}
        >
          Minimal relay. Local-first history. Honest privacy boundaries for
          trusted circles.
        </div>
      </div>
    </div>,
    size,
  );
}
