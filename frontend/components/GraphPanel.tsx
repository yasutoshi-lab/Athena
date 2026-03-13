"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useSession, type GraphNodeData, type GraphEdgeData } from "@/hooks/useSession";

const COLORS: Record<string, string> = {
  question: "#7c5ce5",
  hypothesis: "#c89b24",
  support: "#2dbe8a",
  counter: "#d45757",
  concept: "#6a6a88",
};

const RADIUS: Record<string, number> = {
  question: 26,
  hypothesis: 20,
  support: 10,
  counter: 10,
  concept: 9,
};

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  r: number;
  metadata: Record<string, unknown>;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: string;
}

export default function GraphPanel() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphNodes = useSession((s) => s.graphNodes);
  const graphEdges = useSession((s) => s.graphEdges);
  const progress = useSession((s) => s.progress);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);

  const toggleFilter = (type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Build D3 graph
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current || !containerRef.current) return;

    const panel = containerRef.current;
    const W = panel.clientWidth;
    const H = panel.clientHeight - 44;

    svg.selectAll("*").remove();

    // Defs: glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const fm = filter.append("feMerge");
    fm.append("feMergeNode").attr("in", "blur");
    fm.append("feMergeNode").attr("in", "SourceGraphic");

    const container = svg.append("g");

    // Grid
    const gridG = container.append("g");
    for (let x = 0; x < 2000; x += 40)
      gridG.append("line").attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", 2000).attr("stroke", "rgba(255,255,255,0.025)");
    for (let y = 0; y < 2000; y += 40)
      gridG.append("line").attr("x1", 0).attr("y1", y).attr("x2", 2000).attr("y2", y).attr("stroke", "rgba(255,255,255,0.025)");

    // Convert data
    const nodes: SimNode[] = graphNodes.map((n) => ({
      id: n.node_id,
      type: n.node_type,
      label: n.label,
      r: RADIUS[n.node_type] || 10,
      metadata: n.metadata,
    }));

    const links: SimLink[] = graphEdges
      .filter(
        (e) =>
          nodes.find((n) => n.id === e.source_node_id) &&
          nodes.find((n) => n.id === e.target_node_id)
      )
      .map((e) => ({
        source: e.source_node_id,
        target: e.target_node_id,
        type: e.edge_type,
      }));

    if (nodes.length === 0) {
      // Empty state
      container
        .append("text")
        .attr("x", W / 2)
        .attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-2)")
        .attr("font-size", "13px")
        .attr("font-family", "var(--mono)")
        .text("推論を開始すると知識グラフが表示されます");
      return;
    }

    // Simulation
    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as SimNode;
            const tgt = d.target as SimNode;
            if (src.type === "question" || tgt.type === "question") return 130;
            if (src.type === "hypothesis" || tgt.type === "hypothesis") return 85;
            return 60;
          })
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>((d) => d.r + 14)
      );

    // Links
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.type === "support"
          ? "rgba(45,190,138,0.3)"
          : d.type === "counter"
          ? "rgba(212,87,87,0.3)"
          : "rgba(255,255,255,0.1)"
      )
      .attr("stroke-width", (d) => (d.type === "causal" ? 1.8 : 1))
      .attr("stroke-dasharray", (d) => (d.type === "rel" ? "4,4" : null));

    // Nodes
    const node = container
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_, d) => setSelectedNode(d));

    // Hypothesis ring
    node
      .filter((d) => d.type === "hypothesis")
      .append("circle")
      .attr("r", (d) => d.r + 6)
      .attr("fill", "none")
      .attr("stroke", (d) => COLORS[d.type])
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.3);

    // Main circle
    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => COLORS[d.type] + "18")
      .attr("stroke", (d) => COLORS[d.type])
      .attr("stroke-width", (d) => (d.type === "question" ? 2 : 1.4))
      .attr("filter", (d) => (d.type !== "concept" ? "url(#glow)" : null));

    // Inner dot
    node
      .append("circle")
      .attr("r", (d) => d.r * 0.22)
      .attr("fill", (d) => COLORS[d.type])
      .attr("opacity", 0.75);

    // Labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.r + 14)
      .attr("fill", (d) => COLORS[d.type])
      .attr("font-size", (d) => (d.type === "question" ? "11px" : "9.5px"))
      .attr("font-family", "'Noto Sans JP', sans-serif")
      .attr("font-weight", (d) => (d.type === "question" ? "600" : "400"))
      .attr("opacity", 0.85)
      .each(function (d) {
        const el = d3.select(this);
        d.label.split("\n").forEach((line, i) =>
          el
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? 0 : "1.2em")
            .text(line)
        );
      });

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on("zoom", (e) => container.attr("transform", e.transform));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg as any).call(zoom);

    // Tick
    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Animate in
    node
      .attr("opacity", 0)
      .transition()
      .delay((_, i) => i * 70)
      .duration(380)
      .attr("opacity", 1);
    link.attr("opacity", 0).transition().delay(500).duration(380).attr("opacity", 1);

    // Hover effects
    node
      .on("mouseover", (_, d) => {
        link.attr("opacity", (l) =>
          (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 1 : 0.12
        );
        node.attr("opacity", (n) => {
          const connected = links.some(
            (l) =>
              ((l.source as SimNode).id === d.id && (l.target as SimNode).id === n.id) ||
              ((l.target as SimNode).id === d.id && (l.source as SimNode).id === n.id)
          );
          return n.id === d.id || connected ? 1 : 0.3;
        });
      })
      .on("mouseout", () => {
        link.attr("opacity", 1);
        node.attr("opacity", 1);
      });

    // Visibility filter
    node.attr("display", (d) => (hiddenTypes.has(d.type) ? "none" : ""));
    link.attr("display", (l) => {
      const src = l.source as SimNode;
      const tgt = l.target as SimNode;
      return hiddenTypes.has(src.type) || hiddenTypes.has(tgt.type) ? "none" : "";
    });

    return () => {
      sim.stop();
    };
  }, [graphNodes, graphEdges, hiddenTypes]);

  const filterButtons = [
    { key: "question", label: "Question", cls: "q" },
    { key: "hypothesis", label: "Hypothesis", cls: "h" },
    { key: "support", label: "Support", cls: "s" },
    { key: "counter", label: "Counter", cls: "c" },
    { key: "concept", label: "Concept", cls: "e" },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: "var(--bg-0)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          background: "rgba(14,14,22,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            color: "var(--text-2)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          知識グラフ
        </div>
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              style={{
                padding: "3px 9px",
                borderRadius: 5,
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: COLORS[f.key],
                borderColor: COLORS[f.key] + "59",
                background: COLORS[f.key] + "14",
                border: `1px solid ${COLORS[f.key]}59`,
                cursor: "pointer",
                transition: "all 0.12s",
                letterSpacing: "0.03em",
                opacity: hiddenTypes.has(f.key) ? 0.3 : 1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "calc(100% - 44px)",
        }}
      />

      {/* Progress bar */}
      {progress > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: "var(--accent)",
            width: `${progress}%`,
            transition: "width 0.4s ease",
            zIndex: 30,
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}

      {/* Node detail panel */}
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            width: 240,
            background: "var(--bg-2)",
            border: "1px solid var(--border-focus)",
            borderRadius: 12,
            padding: "14px 15px",
            zIndex: 20,
            animation: "fadeUp 0.2s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              position: "absolute",
              top: 9,
              right: 12,
              color: "var(--text-2)",
              fontSize: 15,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ×
          </button>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 5,
              color: COLORS[selectedNode.type],
            }}
          >
            {selectedNode.type.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: "var(--text-0)",
              lineHeight: 1.5,
              marginBottom: 9,
            }}
          >
            {selectedNode.label.replace(/\n/g, " ")}
          </div>
          {selectedNode.metadata && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--text-1)",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {Object.entries(selectedNode.metadata)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
