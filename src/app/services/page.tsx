import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Star, ArrowRight } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import prismaInstance from "@/lib/db"

export default async function ServicesPage() {
    const services = await prismaInstance.service.findMany();

     if (services.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">Unable to load services. Please try again later.</p>
      </div>
    );
  }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Our Services</h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Discover our range of professional services designed to help you look and feel your best.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {services.map((service) => (
                        <Card
                            key={service.id}
                            className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white"
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl capitalize font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                                            {service.title}
                                        </CardTitle>
                                        <CardDescription className="text-slate-600 mt-2 leading-relaxed">
                                            {service.description}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="bg-teal-100 text-teal-800 hover:bg-teal-200">
                                        <Star className="w-3 h-3 mr-1" />
                                        Popular
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                {/* Features */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-slate-900 mb-3">What's included:</h4>
                                    <ul className="grid grid-cols-2 gap-2">
                                        {service.features.map((feature, index) => (
                                            // biome-ignore lint/suspicious/noArrayIndexKey:no need
                                            <li key={index} className="capitalize text-sm text-slate-600 flex items-center">
                                                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mr-2 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Duration and Price */}
                                <div className="flex items-center justify-between mb-6 p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center text-slate-600">
                                        <Clock className="w-4 h-4 mr-2" />
                                        <span className="text-sm font-medium">{service.duration} minutes</span>
                                    </div>
                                    <div className="flex items-center text-slate-900">                                        
                                        <span className="text-lg font-bold">{formatPrice(service.price)}</span>
                                    </div>
                                </div>

                                {/* Book Now Button */}
                                <Button asChild className="w-full bg-teal-700 hover:bg-teal-800 text-white group">
                                   <Link href={`/book?service=${service.id}`}>
                                        Book Now
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="mt-16 text-center bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-8 text-white">
                    <h2 className="text-2xl font-bold mb-4">Ready to book your appointment?</h2>
                    <p className="text-teal-100 mb-6 max-w-2xl mx-auto">
                        Join thousands of satisfied clients who trust us with their beauty and wellness needs.
                    </p>
                    <Button asChild size="lg" className="bg-white text-teal-700 hover:bg-slate-100">
                        <Link href="/book">
                            Get Started Today
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
