'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, parseISO, addDays, startOfWeek, endOfWeek, isValid } from "date-fns"
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from "lucide-react"

interface VentaDiaria {
  vendedor_id: string;
  vendedor_nombre: string;
  total_ventas: number | string | null;
}

interface VentaSemanal {
  week_start: string;
  week_end: string;
  vendedor_id: string;
  vendedor_nombre: string;
  total_ventas: number | string | null;
}

interface VentasSemana {
  fechaInicio: string;
  fechaFin: string;
  ventas: VentaSemanal[];
}

interface SalesSectionProps {
  userRole: 'Almacen' | 'Vendedor';
}

export default function SalesSection({ userRole }: SalesSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [ventasDiarias, setVentasDiarias] = useState<VentaDiaria[]>([])
  const [ventasSemanales, setVentasSemanales] = useState<VentasSemana[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerVentasDelDia = useCallback(async (fecha: Date) => {
    setIsLoading(true)
    setError(null)

    try {
      const formattedDate = format(fecha, 'yyyy-MM-dd')
      const response = await fetch(`/api/ventas-diarias?fecha=${formattedDate}`)
      
      if (!response.ok) {
        throw new Error('Error al obtener las ventas diarias')
      }

      const data: VentaDiaria[] = await response.json()
      setVentasDiarias(data)
    } catch (error) {
      console.error('Error al obtener ventas diarias:', error)
      setError('Error al obtener las ventas diarias. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const agruparVentasPorSemana = useCallback((ventas: VentaSemanal[]) => {
    const weekMap = new Map<string, VentasSemana>()
    
    ventas.forEach((venta) => {
      const weekStart = parseISO(venta.week_start)
      const weekEnd = parseISO(venta.week_end)
      
      if (!isValid(weekStart) || !isValid(weekEnd)) {
        console.error(`Invalid date in venta: ${venta.week_start} - ${venta.week_end}`)
        return
      }
  
      // Add 1 day to the start and end dates to include the full week
      const adjustedWeekStart = addDays(weekStart, 1);
      const adjustedWeekEnd = addDays(weekEnd, 1);

      const weekKey = `${format(adjustedWeekStart, 'yyyy-MM-dd')}_${format(adjustedWeekEnd, 'yyyy-MM-dd')}`
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          fechaInicio: format(adjustedWeekStart, 'yyyy-MM-dd'),
          fechaFin: format(adjustedWeekEnd, 'yyyy-MM-dd'),
          ventas: []
        })
      }
  
      const currentWeek = weekMap.get(weekKey)!
      currentWeek.ventas.push(venta)
    })
  
    return Array.from(weekMap.values()).sort((a, b) => {
      const dateA = parseISO(a.fechaInicio)
      const dateB = parseISO(b.fechaInicio)
      return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0
    })
  }, [])

  const obtenerVentasSemanales = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ventas-semanales')
      
      if (!response.ok) {
        throw new Error('Error al obtener las ventas semanales')
      }

      const data: VentaSemanal[] = await response.json()
      const ventasAgrupadasPorSemana = agruparVentasPorSemana(data)
      
      setVentasSemanales(ventasAgrupadasPorSemana)
      
      if (ventasAgrupadasPorSemana.length > 0 && !selectedWeek) {
        setSelectedWeek(`${ventasAgrupadasPorSemana[0].fechaInicio},${ventasAgrupadasPorSemana[0].fechaFin}`)
      }
    } catch (error) {
      console.error('Error al obtener ventas semanales:', error)
      setError('Error al obtener las ventas semanales. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWeek, agruparVentasPorSemana])

  useEffect(() => {
    obtenerVentasSemanales()
  }, [obtenerVentasSemanales])

  const handleMostrarVentasDiarias = () => {
    if (selectedDate) {
      obtenerVentasDelDia(selectedDate)
    }
  }

  const formatTotalVentas = (total: number | string | null): string => {
    if (total === null) return '$0.00'
    const numTotal = typeof total === 'string' ? parseFloat(total) : total
    return isNaN(numTotal) ? '$0.00' : `$${numTotal.toFixed(2)}`
  }

  const totalVentasDiarias = ventasDiarias.reduce((sum, venta) => {
    const ventaTotal = typeof venta.total_ventas === 'string' ? parseFloat(venta.total_ventas) : (venta.total_ventas || 0)
    return sum + (isNaN(ventaTotal) ? 0 : ventaTotal)
  }, 0)

  const ventasSemanalesFiltradas = selectedWeek
    ? ventasSemanales.find(semana => `${semana.fechaInicio},${semana.fechaFin}` === selectedWeek)?.ventas || []
    : []

  const totalVentasSemanales = ventasSemanalesFiltradas.reduce((sum, venta) => {
    const ventaTotal = typeof venta.total_ventas === 'string' ? parseFloat(venta.total_ventas) : (venta.total_ventas || 0)
    return sum + (isNaN(ventaTotal) ? 0 : ventaTotal)
  }, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Por Día</TabsTrigger>
            <TabsTrigger value="weekly">Por Semana</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <div className="mb-4 flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleMostrarVentasDiarias} disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Cargar'}
              </Button>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            {!isLoading && ventasDiarias.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ingresos Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasDiarias.map((venta) => (
                    <TableRow key={venta.vendedor_id}>
                      <TableCell>{venta.vendedor_nombre}</TableCell>
                      <TableCell className="text-right">{formatTotalVentas(venta.total_ventas)}</TableCell>
                    </TableRow>
                  ))}
                  {userRole === 'Almacen' && (
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatTotalVentas(totalVentasDiarias)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {!isLoading && ventasDiarias.length === 0 && (
              <div className="text-center text-gray-500">
                No hay ventas registradas para la fecha seleccionada.
              </div>
            )}
          </TabsContent>
          <TabsContent value="weekly">
            <div className="mb-4 flex items-center gap-4">
              <Select value={selectedWeek || ''} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  {ventasSemanales.map((semana, index) => (
                    <SelectItem 
                      key={index} 
                      value={`${semana.fechaInicio},${semana.fechaFin}`}
                    >
                      {`${format(parseISO(semana.fechaInicio), 'dd/MM/yyyy', { locale: es })} - ${format(parseISO(semana.fechaFin), 'dd/MM/yyyy', { locale: es })}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={obtenerVentasSemanales} disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Cargar'}
              </Button>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            {!isLoading && ventasSemanales.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ingresos Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedWeek && ventasSemanalesFiltradas.map((venta) => (
                    <TableRow key={venta.vendedor_id}>
                      <TableCell>{venta.vendedor_nombre}</TableCell>
                      <TableCell className="text-right">{formatTotalVentas(venta.total_ventas)}</TableCell>
                    </TableRow>
                  ))}
                  {userRole === 'Almacen' && selectedWeek && (
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatTotalVentas(totalVentasSemanales)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {!isLoading && ventasSemanales.length === 0 && (
              <div className="text-center text-gray-500">
                No hay ventas registradas para la semana seleccionada.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}