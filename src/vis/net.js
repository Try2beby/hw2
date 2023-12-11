import { DisjointForceDirectedGraph, turnToPage } from "./utils.js";


async function loadData() {
    params.graph = await d3.json(graphDir + graphFile);
    params.semanticGraph = await d3.json(graphDir + semanticGraphFile);
    params.toc = await d3.json(dataDir + tocFile);
    params.location = await d3.json(relationDir + locationFile);
    return;
}


function createNewGraph(root, links, is_chapter = true, is_entity = false, result = {}) {
    // create a new graph with these nodes and links
    const newGraph = {};
    newGraph.links = links;
    // get all the unique nodes in the links
    const nodes = new Set();
    links.forEach(link => {
        nodes.add(link.source);
        nodes.add(link.target);
    });
    newGraph.nodes = [...nodes].map(d => ({ id: d }));
    // set root property for each node
    newGraph.nodes.forEach(node => {
        if (node.id === root.id) {
            node.root = true;
            node.is_entity = is_entity;
        } else {
            node.root = false;
            // add location info
            if (!is_chapter) {
                node.location = result[node.id];
                // sort the location by page number and start position
                if (node.location) {
                    node.location.sort((a, b) => {
                        if (a[0] === b[0]) {
                            return a[1] - b[1];
                        }
                        return a[0] - b[0];
                    });
                }
                node.is_entity = true;
            }
        }
    });
    return newGraph;
}

function initialPlot(root_id = "Deep Learning", is_chapter = true, section_info = {}) {
    const graph = params.graph;
    // find the node with id "Deep Learning"
    const root = graph.nodes.find(d => d.id === root_id);
    // find the links that connect to this node and with relation "parent_content"
    // const links = graph.links.filter(l => (l.source === root.id || l.target === root.id) && (l.relation === "parent_content" || l.relation === "prerequisites"));
    if (is_chapter) {
        var links = graph.links.filter(l => (l.source === root.id) && (l.relation === "parent_content" || l.relation === "prerequisites"));
    }
    else {
        var links = graph.links.filter(l => (l.source === root.id) && (l.relation === "include"));
        var result = findEntityInSection(section_info);
    }

    const newGraph = createNewGraph(root, links, is_chapter, false, result);
    DisjointForceDirectedGraph(newGraph);
}

function entityPlot(root_id) {
    const semanticGraph = params.semanticGraph;
    const graph = params.graph;
    const location = params.location;

    // find the node with id root_id
    const root = semanticGraph.nodes.find(d => d.id === root_id);

    // filter links
    // filter links in graph
    let links = graph.links.filter(l => (l.source === root.id || l.target === root.id) && (l.relation === "co_presence" || l.relation === "prerequisites"));
    // Add links from semantic graph
    links = links.concat(semanticGraph.links.filter(l => (l.source === root.id || l.target === root.id)));

    const nodes = new Set();
    links.forEach(link => {
        nodes.add(link.source);
        nodes.add(link.target);
    });

    let result = {};
    nodes.forEach(node => {
        result[node] = location[node];
    });
    // let result = nodes.reduce((acc, node) => ({ ...acc, [node]: location[node] }), {});

    const newGraph = createNewGraph(root, links, false, true, result);
    DisjointForceDirectedGraph(newGraph);
}

function findEntityInSection(section_info) {
    // each element in location is k,v pair, k is entity id, v is a list of locations
    const location = params.location;

    console.log(section_info);
    const { page, end_page } = section_info;

    // filter entities that are in this section
    let result = {};
    for (let entity in location) {
        let occurrences = location[entity];
        let filteredOccurrences = occurrences.filter(([_page, _]) => _page >= page && _page <= end_page);
        if (filteredOccurrences.length > 0) {
            result[entity] = filteredOccurrences;
        }
    }
    return result;
}



function updateGraph(root_id, is_entity = false) {
    if (is_entity) {
        entityPlot(root_id);
    }
    else {
        const { is_chapter, info } = turnToPage(root_id);
        initialPlot(root_id, is_chapter, info);
    }
}

async function main() {
    await loadData();
    initialPlot();
}

export { initialPlot, updateGraph }

main();