import "../styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <main>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/sales">Sales</Link>
        <Link href="/driver">Driver</Link>
        <Link href="/customer">Customer</Link>
      </nav>
      <Component {...pageProps} />
    </main>
  );
}
