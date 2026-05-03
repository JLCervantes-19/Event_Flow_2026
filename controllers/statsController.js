// controllers/statsController.js
// ──────────────────────────────────────────────────────────────
//  Controlador de estadísticas usando Aggregation Pipelines
//  de MongoDB. Provee las 4 métricas del dashboard analítico.
// ──────────────────────────────────────────────────────────────

import Reservation from '../models/Reservation.js';
import Event from '../models/Event.js';

// ═══════════════════════════════════════════════════════════════
//  1. TOP 5 EVENTOS MÁS RESERVADOS
//     $match → solo confirmadas
//     $group → suma de cantidad por eventoId
//     $sort  → descendente
//     $limit → top 5
//     $lookup→ trae datos del evento
// ═══════════════════════════════════════════════════════════════
export const getTopEventos = async (req, res) => {
  try {
    const pipeline = [
      // Solo reservas confirmadas
      { $match: { estado: 'confirmada' } },

      // Agrupar por evento y sumar entradas reservadas
      {
        $group: {
          _id: '$eventoId',
          totalEntradas: { $sum: '$cantidad' },
          totalReservas: { $count: {} },
          ingresoGenerado: { $sum: { $multiply: ['$cantidad', '$precioUnitario'] } },
        },
      },

      // Ordenar de mayor a menor por entradas
      { $sort: { totalEntradas: -1 } },

      // Solo los top 5
      { $limit: 5 },

      // JOIN con la colección events
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'evento',
        },
      },

      // Desanidar el array resultado del lookup
      { $unwind: '$evento' },

      // Proyectar solo los campos necesarios para la UI
      {
        $project: {
          _id: 0,
          eventoId: '$_id',
          titulo: '$evento.titulo',
          categoria: '$evento.categoria',
          lugar: '$evento.lugar',
          fecha: '$evento.fecha',
          totalEntradas: 1,
          totalReservas: 1,
          ingresoGenerado: 1,
        },
      },
    ];

    const resultado = await Reservation.aggregate(pipeline);
    res.json({ ok: true, data: resultado });
  } catch (error) {
    console.error('[statsController] getTopEventos:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  2. INGRESOS TOTALES AGRUPADOS POR CATEGORÍA
//     $match → confirmadas
//     $lookup→ trae datos del evento (para la categoría)
//     $group → suma precio*cantidad por categoría
//     $sort  → mayor ingreso primero
// ═══════════════════════════════════════════════════════════════
export const getIngresosPorCategoria = async (req, res) => {
  try {
    const pipeline = [
      // Solo reservas confirmadas
      { $match: { estado: 'confirmada' } },

      // Calcular subtotal de esta reserva
      {
        $addFields: {
          subtotal: { $multiply: ['$cantidad', '$precioUnitario'] },
        },
      },

      // JOIN con events para obtener la categoría
      {
        $lookup: {
          from: 'events',
          localField: 'eventoId',
          foreignField: '_id',
          as: 'evento',
        },
      },

      { $unwind: '$evento' },

      // Agrupar por categoría del evento
      {
        $group: {
          _id: '$evento.categoria',
          ingresoTotal: { $sum: '$subtotal' },
          cantidadReservas: { $count: {} },
          entradasVendidas: { $sum: '$cantidad' },
          ticketPromedio: { $avg: '$precioUnitario' },
        },
      },

      { $sort: { ingresoTotal: -1 } },

      // Renombrar _id para la UI
      {
        $project: {
          _id: 0,
          categoria: '$_id',
          ingresoTotal: { $round: ['$ingresoTotal', 2] },
          cantidadReservas: 1,
          entradasVendidas: 1,
          ticketPromedio: { $round: ['$ticketPromedio', 2] },
        },
      },
    ];

    const resultado = await Reservation.aggregate(pipeline);
    res.json({ ok: true, data: resultado });
  } catch (error) {
    console.error('[statsController] getIngresosPorCategoria:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  3. RANKING DE ORGANIZADORES (quién vendió más)
//     Cadena: Reservation → Event → User (organizador)
//     Requiere dos $lookup en cadena
// ═══════════════════════════════════════════════════════════════
export const getRankingOrganizadores = async (req, res) => {
  try {
    const pipeline = [
      // Solo reservas confirmadas
      { $match: { estado: 'confirmada' } },

      // Calcular subtotal
      {
        $addFields: {
          subtotal: { $multiply: ['$cantidad', '$precioUnitario'] },
        },
      },

      // JOIN con events
      {
        $lookup: {
          from: 'events',
          localField: 'eventoId',
          foreignField: '_id',
          as: 'evento',
        },
      },
      { $unwind: '$evento' },

      // Agrupar por organizadorId
      {
        $group: {
          _id: '$evento.organizadorId',
          totalIngresos: { $sum: '$subtotal' },
          totalEntradas: { $sum: '$cantidad' },
          totalReservas: { $count: {} },
          eventosIds: { $addToSet: '$evento._id' },
        },
      },

      // JOIN con users para nombre del organizador
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'organizador',
        },
      },
      { $unwind: '$organizador' },

      // Calcular número de eventos únicos
      {
        $addFields: {
          totalEventos: { $size: '$eventosIds' },
        },
      },

      { $sort: { totalIngresos: -1 } },

      {
        $project: {
          _id: 0,
          organizadorId: '$_id',
          nombre: '$organizador.nombre',
          correo: '$organizador.correo',
          totalIngresos: { $round: ['$totalIngresos', 2] },
          totalEntradas: 1,
          totalReservas: 1,
          totalEventos: 1,
        },
      },
    ];

    const resultado = await Reservation.aggregate(pipeline);
    res.json({ ok: true, data: resultado });
  } catch (error) {
    console.error('[statsController] getRankingOrganizadores:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  4. HISTÓRICO DE RESERVAS AGRUPADAS POR MES
//     $group con $dateToString para formatear la fecha
//     Útil para la gráfica de línea del dashboard
// ═══════════════════════════════════════════════════════════════
export const getHistoricoMensual = async (req, res) => {
  try {
    // Filtro opcional por año (query param: ?year=2025)
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const inicio = new Date(`${year}-01-01T00:00:00.000Z`);
    const fin = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const pipeline = [
      // Filtrar por año y solo confirmadas
      {
        $match: {
          fechaReserva: { $gte: inicio, $lt: fin },
          estado: 'confirmada',
        },
      },

      // Calcular subtotal por reserva
      {
        $addFields: {
          subtotal: { $multiply: ['$cantidad', '$precioUnitario'] },
        },
      },

      // Agrupar por año-mes
      {
        $group: {
          _id: {
            año: { $year: '$fechaReserva' },
            mes: { $month: '$fechaReserva' },
          },
          totalReservas: { $count: {} },
          totalEntradas: { $sum: '$cantidad' },
          ingresosMes: { $sum: '$subtotal' },
        },
      },

      // Ordenar cronológicamente
      { $sort: { '_id.año': 1, '_id.mes': 1 } },

      // Proyectar con etiqueta legible (ej: "2025-03")
      {
        $project: {
          _id: 0,
          periodo: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.año',
                  month: '$_id.mes',
                  day: 1,
                },
              },
            },
          },
          mes: '$_id.mes',
          año: '$_id.año',
          totalReservas: 1,
          totalEntradas: 1,
          ingresosMes: { $round: ['$ingresosMes', 2] },
        },
      },
    ];

    const resultado = await Reservation.aggregate(pipeline);
    res.json({ ok: true, data: resultado, year });
  } catch (error) {
    console.error('[statsController] getHistoricoMensual:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  5. KPIs RESUMEN (tarjetas del dashboard)
//     Un único aggregate para obtener los KPIs globales
// ═══════════════════════════════════════════════════════════════
export const getKPIs = async (req, res) => {
  try {
    // Total reservas, ingresos y entradas
    const [reservasStats] = await Reservation.aggregate([
      { $match: { estado: 'confirmada' } },
      {
        $group: {
          _id: null,
          totalReservas: { $count: {} },
          totalEntradas: { $sum: '$cantidad' },
          ingresoTotal: { $sum: { $multiply: ['$cantidad', '$precioUnitario'] } },
        },
      },
    ]);

    // Total de eventos activos
    const totalEventos = await Event.countDocuments({ activo: true });

    // Reservas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const reservasMes = await Reservation.countDocuments({
      estado: 'confirmada',
      fechaReserva: { $gte: inicioMes },
    });

    res.json({
      ok: true,
      data: {
        totalReservas: reservasStats?.totalReservas ?? 0,
        totalEntradas: reservasStats?.totalEntradas ?? 0,
        ingresoTotal: Math.round((reservasStats?.ingresoTotal ?? 0) * 100) / 100,
        totalEventos,
        reservasMes,
      },
    });
  } catch (error) {
    console.error('[statsController] getKPIs:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
};
