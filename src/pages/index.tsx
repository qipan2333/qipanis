import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function MinimalHomepage() {
  return (
    <div className={styles.minimalContainer}>
      <div className={styles.content}>
        <Heading as="h1" className={styles.title}>
          <span className={styles.tilde}>~</span>qipan2333
        </Heading>

        <div className={styles.section}>
          {/* <h2 className={styles.sectionTitle}>links</h2> */}
          <div className={styles.linksList}>
            <Link href="/blog" className={styles.link}>
              blog<span className={styles.linkDir}>/</span>
            </Link>
            <Link href="/docs/category/others" className={styles.link}>
              notes<span className={styles.linkDir}>/</span>
            </Link>
            <Link href="https://github.com/qipan2333" className={styles.link}>
              github
            </Link>
            {/* <Link
              href="https://www.linkedin.com/in/qipan2333/"
              className={styles.link}
            >
              linkedin
            </Link> */}
            {/* <Link href="/resume" className={styles.link}>
              resume
            </Link>
            <Link href="/docs/projects/github-actions" className={styles.link}>
              projects<span className={styles.linkDir}>/</span>
            </Link> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <div className={styles.homepageContainer}>
      <Layout title={siteConfig.title} description="qipan2333">
        <MinimalHomepage />
      </Layout>
    </div>
  );
}
