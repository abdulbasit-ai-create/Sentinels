import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Demo from '@/components/Demo'
import Features from '@/components/Features'
import Stats from '@/components/Stats'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import Comparison from '@/components/Comparison'
import Pricing from '@/components/Pricing'
import InstallGuide from '@/components/InstallGuide'
import APIDocs from '@/components/APIDocs'
import Blog from '@/components/Blog'
import Changelog from '@/components/Changelog'
import FAQ from '@/components/FAQ'
import Security from '@/components/Security'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Demo />
        <Features />
        <Stats />
        <HowItWorks />
        <Testimonials />
        <Comparison />
        <Pricing />
        <InstallGuide />
        <APIDocs />
        <Blog />
        <Changelog />
        <FAQ />
        <Security />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
