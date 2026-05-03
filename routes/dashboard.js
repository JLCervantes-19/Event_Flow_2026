// routes/dashboard.js
// ──────────────────────────────────────────────────────────────
//  Rutas del Dashboard Analítico
//  Conecta los endpoints con los Aggregation Pipelines
//
//  Base URL: /api/dashboard
// ──────────────────────────────────────────────────────────────

import { Router } from 'express';
import {
  getTopEventos,
  getIngresosPorCategoria,
  getRankingOrganizadores,
  getHistoricoMensual,
  getKPIs,
} from '../controllers/statsController.js';

const router = Router();

/**
 * @route   GET /api/dashboard/kpis
 * @desc    KPIs generales: totales de reservas, ingresos, eventos
 * @access  Private (Admin / Organizador)
 */
router.get('/kpis', getKPIs);

/**
 * @route   GET /api/dashboard/top-eventos
 * @desc    Top 5 eventos más reservados con ingresos
 * @access  Private
 */
router.get('/top-eventos', getTopEventos);

/**
 * @route   GET /api/dashboard/ingresos-por-categoria
 * @desc    Ingresos totales agrupados por categoría de evento
 * @access  Private
 */
router.get('/ingresos-por-categoria', getIngresosPorCategoria);

/**
 * @route   GET /api/dashboard/ranking-organizadores
 * @desc    Ranking de organizadores por ventas e ingresos
 * @access  Private (Admin)
 */
router.get('/ranking-organizadores', getRankingOrganizadores);

/**
 * @route   GET /api/dashboard/historico-mensual
 * @desc    Serie temporal de reservas agrupadas por mes
 * @query   year  — año a filtrar (default: año actual)
 * @example /api/dashboard/historico-mensual?year=2025
 * @access  Private
 */
router.get('/historico-mensual', getHistoricoMensual);

export default router;
