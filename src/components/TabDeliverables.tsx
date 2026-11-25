import React, { useState } from 'react';
import { Download } from 'lucide-react';
import {
  AGILE_IMPEDIMENTS,
  AGILE_PRODUCT_BACKLOG,
  AGILE_RETROSPECTIVE,
  AGILE_SPRINT1_BACKLOG,
  DEFECT_TRACKER_DATA,
  UNIT_TEST_PLAN_DATA,
} from '../data/deliverablesData';
import { serializeToCsv } from '../utils/matchingEngine';

type DeliverableFile = 'unit_test' | 'defect_tracker' | 'agile_template';
type AgileSheet = 'product_backlog' | 'sprint_1' | 'impediments' | 'retrospective';

function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TabDeliverables() {
  const [activeFile, setActiveFile] = useState<DeliverableFile>('unit_test');
  const [agileSheet, setAgileSheet] = useState<AgileSheet>('product_backlog');

  const handleExportCurrent = () => {
    if (activeFile === 'unit_test') {
      const csv = serializeToCsv(
        UNIT_TEST_PLAN_DATA as unknown as Record<string, unknown>[],
        [
          { key: 'sl_no', header: 'Sl: No:' },
          { key: 'test_case_name', header: 'Test Case Name' },
          { key: 'test_procedure', header: 'Test Procedure' },
          { key: 'condition_to_be_tested', header: 'Condition to be tested' },
          { key: 'expected_result', header: 'Expected Result' },
          { key: 'actual_result', header: 'Actual Result' },
        ],
      );
      downloadCsvFile(csv, 'Unit_Test_Plan_v0.1_Updated.csv');
      return;
    }

    if (activeFile === 'defect_tracker') {
      const csv = serializeToCsv(
        DEFECT_TRACKER_DATA as unknown as Record<string, unknown>[],
        [
          { key: 'sl_no', header: 'Sl No' },
          { key: 'submitted_by', header: 'Submitted By' },
          { key: 'submitted_date', header: 'Submitted Date' },
          { key: 'description', header: 'Description' },
          { key: 'detected_sprint', header: 'Detected Sprint' },
          { key: 'assigned_to', header: 'Assigned To' },
          { key: 'type_of_defect', header: 'Type Of Defect' },
          { key: 'action_taken', header: 'Action Taken' },
          { key: 'action_taken_date', header: 'Action Taken Date' },
          { key: 'status', header: 'Status(Open/Closed)' },
          { key: 'remarks', header: 'Remarks' },
        ],
      );
      downloadCsvFile(csv, 'Defect_Tracker_Template_v0.1_Updated.csv');
      return;
    }

    if (agileSheet === 'product_backlog') {
      const csv = serializeToCsv(
        AGILE_PRODUCT_BACKLOG as unknown as Record<string, unknown>[],
        [
          { key: 'planned_sprint', header: 'Planned Sprint' },
          { key: 'actual_sprint', header: 'Actual Sprint' },
          { key: 'us_id', header: 'US ID' },
          { key: 'user_story_description', header: 'User Story Description' },
          { key: 'moscow', header: 'MOSCOW' },
          { key: 'dependency', header: 'Dependency' },
          { key: 'assignee', header: 'Assignee' },
          { key: 'status', header: 'Status' },
        ],
      );
      downloadCsvFile(csv, 'Agile_Template_Product_Backlog.csv');
    } else if (agileSheet === 'sprint_1') {
      const flat = AGILE_SPRINT1_BACKLOG.map((row) => {
        const record: Record<string, unknown> = {
          us_id: row.us_id,
          task_id: row.task_id,
          task_description: row.task_description,
          task_start_date: row.task_start_date,
          task_completion_date: row.task_completion_date,
          team_member: row.team_member,
          activity: row.activity,
          status: row.status,
          original_estimate_hours: row.original_estimate_hours,
        };
        row.daily_remaining.forEach((hrs, idx) => {
          record[`day_${idx + 1}`] = hrs;
        });
        return record;
      });
      const cols: Array<{ key: string; header: string }> = [
        { key: 'us_id', header: 'US ID' },
        { key: 'task_id', header: 'Task ID' },
        { key: 'task_description', header: 'Task Description' },
        { key: 'task_start_date', header: 'Task Start Date' },
        { key: 'task_completion_date', header: 'Task Completion Date' },
        { key: 'team_member', header: 'Team Member' },
        { key: 'activity', header: 'Activity' },
        { key: 'status', header: 'Status' },
        { key: 'original_estimate_hours', header: 'Original Estimate Effort (In Hours)' },
        ...Array.from({ length: 14 }, (_, i) => ({
          key: `day_${i + 1}`,
          header: `Day ${i + 1}`,
        })),
      ];
      downloadCsvFile(serializeToCsv(flat, cols), 'Agile_Template_Sprint1_Backlog.csv');
    } else if (agileSheet === 'impediments') {
      const csv = serializeToCsv(
        AGILE_IMPEDIMENTS as unknown as Record<string, unknown>[],
        [
          { key: 'sprint', header: 'Sprint' },
          { key: 'day', header: 'Day' },
          { key: 'impediments', header: 'Impediments' },
          { key: 'action_taken', header: 'Action Taken' },
        ],
      );
      downloadCsvFile(csv, 'Agile_Template_Impediments.csv');
    } else {
      const csv = serializeToCsv(
        AGILE_RETROSPECTIVE as unknown as Record<string, unknown>[],
        [
          { key: 'sl_no', header: 'SL #' },
          { key: 'sprint_no', header: 'Sprint #' },
          { key: 'sprint_start_date', header: 'Sprint start date' },
          { key: 'sprint_end_date', header: 'Sprint end date' },
          { key: 'team_member_name', header: 'Team member name' },
          { key: 'start_doing', header: 'Start Doing' },
          { key: 'stop_doing', header: 'Stop Doing' },
          { key: 'continue_doing', header: 'Continue Doing' },
          { key: 'action_taken', header: 'Action taken' },
        ],
      );
      downloadCsvFile(csv, 'Agile_Template_Retrospective.csv');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Springboard Project Deliverables (3 Updated Templates)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Complete updated records matching your attached Unit Test Plan, Defect Tracker, and
            4-sheet Agile Template — ready for direct spreadsheet import and mentor review.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCurrent}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Export Current Table CSV
        </button>
      </div>

      {/* Primary File Selector (Interactive Segmented Control) */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
        {(
          [
            { id: 'unit_test', label: '1. Unit Test Plan (10 Cases)' },
            { id: 'defect_tracker', label: '2. Defect Tracker (8 Records)' },
            { id: 'agile_template', label: '3. Agile Template (4 Sheets)' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveFile(item.id)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeFile === item.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* FILE 1: UNIT TEST PLAN */}
      {activeFile === 'unit_test' && (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Unit_Test_Plan_v0.1 — Updated Test Cases
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Sl: No:</th>
                  <th className="px-3.5 py-2.5 min-w-[180px]">Test Case Name</th>
                  <th className="px-3.5 py-2.5 min-w-[220px]">Test Procedure</th>
                  <th className="px-3.5 py-2.5 min-w-[200px]">Condition to be tested</th>
                  <th className="px-3.5 py-2.5 min-w-[210px]">Expected Result</th>
                  <th className="px-3.5 py-2.5 min-w-[200px]">Actual Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {UNIT_TEST_PLAN_DATA.map((row) => (
                  <tr key={row.sl_no} className="hover:bg-slate-50 align-top">
                    <td className="px-3.5 py-3 font-mono font-medium text-slate-600 tabular-nums">
                      {row.sl_no}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-900">{row.test_case_name}</td>
                    <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.test_procedure}</td>
                    <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.condition_to_be_tested}</td>
                    <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.expected_result}</td>
                    <td className="px-3.5 py-3 font-medium text-emerald-800 leading-relaxed">
                      {row.actual_result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FILE 2: DEFECT TRACKER */}
      {activeFile === 'defect_tracker' && (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Defect_Tracker_Template_v0.1 — Sprint 1 &amp; Sprint 2 Log
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="px-3 py-2.5 whitespace-nowrap">Sl No</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Submitted By</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Submitted Date</th>
                  <th className="px-3 py-2.5 min-w-[220px]">Description</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Detected Sprint</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Assigned To</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Type Of Defect</th>
                  <th className="px-3 py-2.5 min-w-[220px]">Action Taken</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Action Date</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 min-w-[160px]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEFECT_TRACKER_DATA.map((row) => (
                  <tr key={row.sl_no} className="hover:bg-slate-50 align-top">
                    <td className="px-3 py-3 font-mono text-slate-600 tabular-nums">{row.sl_no}</td>
                    <td className="px-3 py-3 text-slate-800 whitespace-nowrap">{row.submitted_by}</td>
                    <td className="px-3 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {row.submitted_date}
                    </td>
                    <td className="px-3 py-3 text-slate-700 leading-relaxed">{row.description}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{row.detected_sprint}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{row.assigned_to}</td>
                    <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {row.type_of_defect}
                    </td>
                    <td className="px-3 py-3 text-slate-700 leading-relaxed">{row.action_taken}</td>
                    <td className="px-3 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {row.action_taken_date}
                    </td>
                    <td className="px-3 py-3 font-semibold text-emerald-700 whitespace-nowrap">
                      {row.status}
                    </td>
                    <td className="px-3 py-3 text-slate-600 leading-relaxed">{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FILE 3: AGILE TEMPLATE (4 SHEETS) */}
      {activeFile === 'agile_template' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            {(
              [
                { id: 'product_backlog', label: 'Sheet 1: Product Backlog' },
                { id: 'sprint_1', label: 'Sheet 2: Sprint 1 Backlog (Day 1–14)' },
                { id: 'impediments', label: 'Sheet 3: Impediments' },
                { id: 'retrospective', label: 'Sheet 4: Retrospective' },
              ] as const
            ).map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                onClick={() => setAgileSheet(sheet.id)}
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 -mb-2.5 ${
                  agileSheet === sheet.id
                    ? 'border-blue-700 text-blue-700 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {sheet.label}
              </button>
            ))}
          </div>

          {agileSheet === 'product_backlog' && (
            <section className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Planned Sprint</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Actual Sprint</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">US ID</th>
                    <th className="px-3.5 py-2.5 min-w-[300px]">User Story Description</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">MOSCOW</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Dependency</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Assignee</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AGILE_PRODUCT_BACKLOG.map((row) => (
                    <tr key={row.us_id} className="hover:bg-slate-50 align-top">
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{row.planned_sprint}</td>
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{row.actual_sprint}</td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.us_id}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 leading-relaxed">
                        {row.user_story_description}
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {row.moscow}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.dependency}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">{row.assignee}</td>
                      <td className="px-3.5 py-3 font-semibold whitespace-nowrap">
                        <span
                          className={
                            row.status === 'Completed' ? 'text-emerald-700' : 'text-slate-600'
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {agileSheet === 'sprint_1' && (
            <section className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                Task sizing: 6–12 hours per task (strictly within 0.5–12h template guideline) · Total Sprint 1 Effort: 58 hours
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="px-2 py-2 whitespace-nowrap">US ID</th>
                    <th className="px-2 py-2 whitespace-nowrap">Task</th>
                    <th className="px-2 py-2 min-w-[190px]">Task Description</th>
                    <th className="px-2 py-2 whitespace-nowrap">Start</th>
                    <th className="px-2 py-2 whitespace-nowrap">Done</th>
                    <th className="px-2 py-2 whitespace-nowrap">Member</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">Est</th>
                    {Array.from({ length: 14 }, (_, i) => (
                      <th key={i} className="px-1.5 py-2 text-right font-mono text-[11px] whitespace-nowrap">
                        D{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AGILE_SPRINT1_BACKLOG.map((row) => (
                    <tr key={row.task_id} className="hover:bg-slate-50">
                      <td className="px-2 py-2.5 font-mono text-slate-600 whitespace-nowrap">{row.us_id}</td>
                      <td className="px-2 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.task_id}
                      </td>
                      <td className="px-2 py-2.5 text-slate-700">{row.task_description}</td>
                      <td className="px-2 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {row.task_start_date.slice(5)}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {row.task_completion_date.slice(5)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-700 whitespace-nowrap">{row.team_member}</td>
                      <td className="px-2 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {row.original_estimate_hours}h
                      </td>
                      {row.daily_remaining.map((h, i) => (
                        <td
                          key={i}
                          className={`px-1.5 py-2.5 text-right font-mono text-[11px] tabular-nums ${
                            h === 0 ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {h}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {agileSheet === 'impediments' && (
            <section className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="px-4 py-2.5 whitespace-nowrap">Sprint</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Day</th>
                    <th className="px-4 py-2.5">Impediments</th>
                    <th className="px-4 py-2.5">Action Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AGILE_IMPEDIMENTS.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {row.sprint}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.day}
                      </td>
                      <td className="px-4 py-3 text-slate-700 leading-relaxed">{row.impediments}</td>
                      <td className="px-4 py-3 text-slate-700 leading-relaxed">{row.action_taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {agileSheet === 'retrospective' && (
            <section className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="px-3.5 py-2.5 whitespace-nowrap">SL #</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Sprint #</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Start Date</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">End Date</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Team Member</th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">Start Doing</th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">Stop Doing</th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">Continue Doing</th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">Action Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AGILE_RETROSPECTIVE.map((row) => (
                    <tr key={row.sl_no} className="hover:bg-slate-50 align-top">
                      <td className="px-3.5 py-3 font-mono text-slate-600 tabular-nums">{row.sl_no}</td>
                      <td className="px-3.5 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {row.sprint_no}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.sprint_start_date}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.sprint_end_date}
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {row.team_member_name}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.start_doing}</td>
                      <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.stop_doing}</td>
                      <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.continue_doing}</td>
                      <td className="px-3.5 py-3 text-slate-700 leading-relaxed">{row.action_taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
