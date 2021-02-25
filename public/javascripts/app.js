/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
import Templates from './createTemplates.js';
import makeRequest from './makeRequest.js';
import debounce from './debounce.js';

const ContactManager = {
  getAllContacts() {
    return makeRequest("GET", "/api/contacts");
  },

  saveContact(data) {
    return makeRequest("POST", "/api/contacts/", data);
  },

  getContact(id) {
    return makeRequest("GET", `/api/contacts/${id}`);
  },

  updateContact(id, data) {
    return makeRequest("PUT", `/api/contacts/${id}`, data);
  },

  deleteContact(id) {
    return makeRequest("DELETE", `/api/contacts/${id}`, JSON.stringify({id}));
  }
};

const Searchbar = {
  init(searchbarSelector, collectionClass) {
    this.$searchbar = $(searchbarSelector);
    this.collection = document.getElementsByClassName(collectionClass);
    this.valueChanged = debounce(this.valueChanged.bind(this), 200);
    this.bindEvents();
  },

  bindEvents() {
    this.$searchbar.on('input', this.valueChanged);
  },

  valueChanged() {
    let currentSearch = this.$searchbar.val();

    this.reset();

    if (currentSearch.length > 0) {
      let regex = new RegExp(currentSearch, "i");

      $(this.collection).filter((_, contact) => {
        return !regex.test($(contact).attr('name'));
      }).addClass('hideByName');
    }
  },

  reset() {
    $(this.collection).removeClass('hideByName');
  },
};

const Searchtags = {
  init(tagListSelector, collectionClass) {
    this.$tagList = $(tagListSelector);
    this.collection = document.getElementsByClassName(collectionClass);
    this.bindEvents();
  },

  bindEvents() {
    this.$tagList.on('click', this.valueChanged.bind(this));
  },

  valueChanged(event) {
    if ($(event.target).is('ul')) return;

    $(event.target).toggleClass('selected');
    let currentSearch = $(".selected").text();

    this.reset();

    if (currentSearch.length > 0) {
      let searchWords = currentSearch.match(/(?<=#)\w+/g);

      $(this.collection).filter((_,contact) => {
        let tags = $(contact).find('.tags').text();
        return !searchWords.every(tag => tags.includes(tag));
      }).addClass('hideByTag');
    }
  },

  reset() {
    $(this.collection).removeClass('hideByTag');
  },
};

function observeAttributes(targetSelector, callback) {
  let targetNode = document.querySelector(targetSelector);

  let observerOptions = {
    attributes: true,
    subtree: true
  };

  let observer = new MutationObserver(callback);
  observer.observe(targetNode, observerOptions);
}

const App = (() => {
  let allTags = [];

  function display(template, delay) {
    let $content = $('main').children();
    $('main').append(template);
    $content.slideUp(delay, () => $content.remove());
  }

  function getTagsFromStr(str) {
    return str.toLowerCase().split(/\W+\s*\W*/)
      .filter(tag => tag).map(tag => tag.trim().replace(/\s+/,' '));
  }

  function getTagsFromContacts(contacts) {
    let tags = contacts.map(contact => contact.tags).join(',');
    let tagList = getTagsFromStr(tags);
    return [...new Set(tagList)];
  }

  function invalidFullName(name) {
    return !(/\w+( \w+)+/).test(name);
  }

  function invalidEmail(email) {
    return !(/^\w+(\.\w+)*@\w+(\.\w+)+$/).test(email);
  }

  function invalidPhoneNumber(number) {
    return !(/^\d{10}$/).test(number);
  }

  function addAlert(node) {
    $(node).closest('.field').addClass('alert');
    $(node).next('.alert-info').show();
  }

  function removeAllAlerts() {
    $('.alert').removeClass('alert');
    $('.alert-info').hide();
  }

  function validateContactFormData() {
    removeAllAlerts();
    let form = document.forms['contact-form'];
    let data = Object.fromEntries(new FormData(form));
    let valid = true;

    if (invalidFullName(data.full_name)) {
      addAlert(form.full_name);
      valid = false;
    }

    if (invalidEmail(data.email)) {
      addAlert(form.email);
      valid = false;
    }

    if (invalidPhoneNumber(data.phone_number)) {
      addAlert(form.phone_number);
      valid = false;
    }

    return valid ? data : false;
  }

  return {
    init() {
      Templates.init();
      this.displayHomePage(0);
    },

    displayHomePage(delay) {
      ContactManager.getAllContacts()
        .then(contacts => {
          allTags = getTagsFromContacts(contacts);
          display(Templates.homepage({allTags, contacts}), delay);
          Searchbar.init('#searchbar', 'contact-card');
          Searchtags.init('#tagList', 'contact-card');

          observeAttributes('#contacts', () => {
            $('#message').remove();
            if ($('.contact-card').filter(':visible').length === 0) {
              let message =
                ` matching ${[$('#searchbar').val(), $('.selected').text()]
                  .filter(text => text).join(" and ")}`;

              $('#contacts').append(Templates.no_contacts({message}));
            }
          });

          $('#homepage').click(event => {
            event.preventDefault();

            let $target = $(event.target);
            if (!$target.hasClass('button')) return;

            let contactCard = event.target.closest('.contact-card');

            if ($target.hasClass('addBtn')) {
              this.displayEditContact();
            } else if ($target.hasClass('editBtn')) {
              ContactManager.getContact(contactCard.id)
                .then(contact => this.displayEditContact(contact, 500))
                .catch(xhr => alert(xhr.statusText));
            } else if ($target.hasClass('deleteBtn')) {
              if (!confirm("Do you want to delete the contact?")) return;
              ContactManager.deleteContact(contactCard.id)
                .then(() => {
                  contactCard.remove();
                  this.displayHomePage(0);
                })
                .catch(xhr => alert(xhr.statusText));
            }
          });
        })
        .catch(xhr => alert(xhr.statusText));
    },

    displayEditContact(contact, delay) {
      display(Templates.edit_contact({allTags, ...contact}), delay);

      let tags = contact ? getTagsFromContacts([contact]) : [];

      $('#tagging').change(event => {
        let $target = $(event.target);
        if ($target.is('textarea')) {
          tags = [...new Set(getTagsFromStr($('textarea').val()))];
        } else {
          let selected = [...$(':selected')].map(option => option.value);
          tags = tags.filter(tag => !allTags.includes(tag));
          tags.push(...selected);
        }
        $('textarea').val(tags.join(', '));
      });

      $('form').click(event => {
        event.preventDefault();

        let $target = $(event.target);
        if (!$target.hasClass('button')) return;

        if ($target.attr('id') === 'cancelBtn') {
          this.displayHomePage();
        } else {
          let data = validateContactFormData();
          if (data) {
            let json = JSON.stringify(data);
            let promise = contact ?
              ContactManager.updateContact(contact.id, json) :
              ContactManager.saveContact(json);
            promise.then(() => this.displayHomePage())
              .catch(xhr => alert(xhr.statusText));
          }
        }
      });
    },
  };
})();

$(function() {
  App.init();
});