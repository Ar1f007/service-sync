import Link from "next/link"
import { Calendar, ArrowRight, Smartphone, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative bg-gradient-to-br from-teal-50 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 bg-teal-100 text-teal-800">
              Professional Appointment Booking
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Book appointments with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-700">
                ease and confidence
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              ServiceSync connects you with professional service providers. Book haircuts, massages, facials and more
              with our modern, user-friendly platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* <Button asChild size="lg" className="bg-teal-700 hover:bg-teal-800 text-white">
                <Link href="/sign-in">
                  Start Booking Today
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button> */}
              <Button asChild variant="outline" size="lg">
                <Link href="/services">Browse Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why choose ServiceSync?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We make booking appointments simple, secure, and convenient for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-teal-700" />
                </div>
                <CardTitle>Easy Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Book appointments in seconds with our intuitive interface. See real-time availability and choose your
                  preferred time.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-teal-700" />
                </div>
                <CardTitle>Secure & Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Your data is protected with enterprise-grade security. Reliable booking system you can trust.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-teal-700" />
                </div>
                <CardTitle>Mobile Friendly</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Book on the go with our responsive design. Perfect experience on any device, anywhere.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-teal-700 mb-2">10,000+</div>
              <div className="text-slate-600">Happy Clients</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-700 mb-2">500+</div>
              <div className="text-slate-600">Service Providers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-700 mb-2">50,000+</div>
              <div className="text-slate-600">Appointments Booked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-700 mb-2">4.9/5</div>
              <div className="text-slate-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-xl text-teal-100 mb-8">
            Join thousands of satisfied clients who trust ServiceSync for their appointment needs.
          </p>
          <Button asChild size="lg" className="bg-white text-teal-700 hover:bg-slate-100">
            <Link href="/sign-in">
              Create Your Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>      
    </div>
  )
}
