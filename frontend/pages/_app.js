import "../styles/globals.css";
import Link from "next/link";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Delivery Verification — IFB452 Group 49</title>
        <meta
          name="description"
          content="IFB452 Blockchain Technology group project — Solidity smart contracts on Ethereum for building-products supply chain delivery verification."
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">DV</span>
            <span>
              Delivery Verification
              <span className="brand-sub" style={{ display: "block", lineHeight: 1 }}>
                IFB452 · Group 49
              </span>
            </span>
          </Link>
          <nav className="primary-nav">
            <Link href="/">Home</Link>
            <Link href="/sales">Sales</Link>
            <Link href="/driver">Driver</Link>
            <Link href="/customer">Customer</Link>
          </nav>
        </div>
      </header>
      <main>
        <Component {...pageProps} />
      </main>
      <footer className="site-footer">
        IFB452 Blockchain Technology · Joshua Mills &amp; Alexander Venn
      </footer>
    </>
  );
}
