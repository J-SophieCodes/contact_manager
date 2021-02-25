const Templates = {
  init() {
    let nodeList = document.querySelectorAll('[type="text/x-handlebars"]');
    nodeList.forEach(node => {
      this[node.id] = Handlebars.compile(node.innerHTML);
      if (node.classList.contains('partial')) {
        Handlebars.registerPartial(node.id, node.innerHTML);
      }
      node.remove();
    });
  },
};

export { Templates as default };