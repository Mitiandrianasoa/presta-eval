<script setup lang="ts">
import { ref, computed } from 'vue';
import Sidebar from '../../components/Sidebar.vue';
import api from '../../api/api';

// Liste complète des tables PrestaShop (mappées aux endpoints API disponibles)
// Note: Toutes les tables SQL n'ont pas forcément un endpoint API exposé
const tables = [
  // =====================================================
  // === PRODUITS & CATALOGUE (22 tables) ===
  // =====================================================
  { label: 'Produits', table: 'ps_product', endpoint: 'products', tag: 'product' },
  { label: 'Catégories', table: 'ps_category', endpoint: 'categories', tag: 'category', skip: [1, 2] },
  { label: 'Marques/Fabricants', table: 'ps_manufacturer', endpoint: 'manufacturers', tag: 'manufacturer' },
  { label: 'Fournisseurs', table: 'ps_supplier', endpoint: 'suppliers', tag: 'supplier' },
  { label: 'Caractéristiques produits', table: 'ps_feature', endpoint: 'product_features', tag: 'product_feature' },
  { label: 'Valeurs caractéristiques', table: 'ps_feature_value', endpoint: 'product_feature_values', tag: 'product_feature_value' },
  { label: 'Déclinaisons/Combinaisons', table: 'ps_product_attribute', endpoint: 'combinations', tag: 'combination' },
  { label: 'Groupes attributs', table: 'ps_attribute_group', endpoint: 'product_options', tag: 'product_option' },
  { label: 'Attributs/Valeurs', table: 'ps_attribute', endpoint: 'product_option_values', tag: 'product_option_value' },
  { label: 'Tags produits', table: 'ps_tag', endpoint: 'tags', tag: 'tag' },
  { label: 'Pièces jointes', table: 'ps_attachment', endpoint: 'attachments', tag: 'attachment' },
  { label: 'Images produits', table: 'ps_image', endpoint: 'images', tag: 'image', soft: true },
  { label: 'Types d\'images', table: 'ps_image_type', endpoint: 'image_types', tag: 'image_type', soft: true },
  { label: 'Produits - Catégories', table: 'ps_category_product', endpoint: 'category_products', tag: 'category_product', soft: true },
  { label: 'Produits - Pièces jointes', table: 'ps_product_attachment', endpoint: 'product_attachments', tag: 'product_attachment', soft: true },
  { label: 'Produits - Fournisseurs', table: 'ps_product_supplier', endpoint: 'product_suppliers', tag: 'product_supplier', soft: true },
  { label: 'Produits - Déclinaisons images', table: 'ps_product_attribute_image', endpoint: 'product_attribute_images', tag: 'product_attribute_image', soft: true },
  { label: 'Produits - Déclinaisons combinaisons', table: 'ps_product_attribute_combination', endpoint: 'product_attribute_combinations', tag: 'product_attribute_combination', soft: true },
  { label: 'Produits - Pays taxes', table: 'ps_product_country_tax', endpoint: 'product_country_taxes', tag: 'product_country_tax', soft: true },
  { label: 'Produits - Téléchargements', table: 'ps_product_download', endpoint: 'product_downloads', tag: 'product_download', soft: true },
  { label: 'Produits - Groupes réduction', table: 'ps_product_group_reduction_cache', endpoint: 'product_group_reduction_caches', tag: 'product_group_reduction_cache', soft: true },
  { label: 'Produits - Ventes', table: 'ps_product_sale', endpoint: 'product_sales', tag: 'product_sale', soft: true },
  { label: 'Produits - Tags', table: 'ps_product_tag', endpoint: 'product_tags', tag: 'product_tag', soft: true },
  { label: 'Produits - Paniers', table: 'ps_pack', endpoint: 'packs', tag: 'pack', soft: true },
  { label: 'Accessoires', table: 'ps_accessory', endpoint: 'accessories', tag: 'accessory', soft: true },
  
  // =====================================================
  // === PRIX & PROMOTIONS (8 tables) ===
  // =====================================================
  { label: 'Prix spécifiques', table: 'ps_specific_price', endpoint: 'specific_prices', tag: 'specific_price' },
  { label: 'Règles prix spécifiques', table: 'ps_specific_price_rule', endpoint: 'specific_price_rules', tag: 'specific_price_rule', soft: true },
  { label: 'Conditions règles prix', table: 'ps_specific_price_rule_condition', endpoint: 'specific_price_rule_conditions', tag: 'specific_price_rule_condition', soft: true },
  { label: 'Groupes conditions prix', table: 'ps_specific_price_rule_condition_group', endpoint: 'specific_price_rule_condition_groups', tag: 'specific_price_rule_condition_group', soft: true },
  { label: 'Priorité prix spécifiques', table: 'ps_specific_price_priority', endpoint: 'specific_price_priorities', tag: 'specific_price_priority', soft: true },
  { label: 'Règles panier', table: 'ps_cart_rule', endpoint: 'cart_rules', tag: 'cart_rule' },
  { label: 'Règles panier - Transporteurs', table: 'ps_cart_rule_carrier', endpoint: 'cart_rule_carriers', tag: 'cart_rule_carrier', soft: true },
  { label: 'Règles panier - Combinaisons', table: 'ps_cart_rule_combination', endpoint: 'cart_rule_combinations', tag: 'cart_rule_combination', soft: true },
  { label: 'Règles panier - Pays', table: 'ps_cart_rule_country', endpoint: 'cart_rule_countries', tag: 'cart_rule_country', soft: true },
  { label: 'Règles panier - Groupes', table: 'ps_cart_rule_group', endpoint: 'cart_rule_groups', tag: 'cart_rule_group', soft: true },
  { label: 'Règles panier - Règles produits', table: 'ps_cart_rule_product_rule', endpoint: 'cart_rule_product_rules', tag: 'cart_rule_product_rule', soft: true },
  { label: 'Règles panier - Groupes produits', table: 'ps_cart_rule_product_rule_group', endpoint: 'cart_rule_product_rule_groups', tag: 'cart_rule_product_rule_group', soft: true },
  { label: 'Règles panier - Valeurs produits', table: 'ps_cart_rule_product_rule_value', endpoint: 'cart_rule_product_rule_values', tag: 'cart_rule_product_rule_value', soft: true },
  { label: 'Réductions groupe', table: 'ps_group_reduction', endpoint: 'group_reductions', tag: 'group_reduction', soft: true },
  
  // =====================================================
  // === CLIENTS & COMMANDES (25 tables) ===
  // =====================================================
  { label: 'Clients', table: 'ps_customer', endpoint: 'customers', tag: 'customer' },
  { label: 'Sessions clients', table: 'ps_customer_session', endpoint: 'customer_sessions', tag: 'customer_session', soft: true },
  { label: 'Adresses', table: 'ps_address', endpoint: 'addresses', tag: 'address' },
  { label: 'Formats adresses', table: 'ps_address_format', endpoint: 'address_formats', tag: 'address_format', soft: true },
  { label: 'Groupes clients', table: 'ps_group', endpoint: 'groups', tag: 'group' },
  { label: 'Clients - Groupes', table: 'ps_customer_group', endpoint: 'customer_groups', tag: 'customer_group', soft: true },
  { label: 'Genres', table: 'ps_gender', endpoint: 'genders', tag: 'gender', soft: true },
  { label: 'Invités', table: 'ps_guest', endpoint: 'guests', tag: 'guest', soft: true },
  { label: 'Commandes', table: 'ps_orders', endpoint: 'orders', tag: 'order', soft: true },
  { label: 'Paniers', table: 'ps_cart', endpoint: 'carts', tag: 'cart', soft: true },
  { label: 'Produits paniers', table: 'ps_cart_product', endpoint: 'cart_products', tag: 'cart_product', soft: true },
  { label: 'Règles panier dans paniers', table: 'ps_cart_cart_rule', endpoint: 'cart_cart_rules', tag: 'cart_cart_rule', soft: true },
  { label: 'Détails commandes', table: 'ps_order_detail', endpoint: 'order_details', tag: 'order_detail', soft: true },
  { label: 'Taxes détails commandes', table: 'ps_order_detail_tax', endpoint: 'order_detail_taxes', tag: 'order_detail_tax', soft: true },
  { label: 'Historique commandes', table: 'ps_order_history', endpoint: 'order_histories', tag: 'order_history', soft: true },
  { label: 'Statuts commandes', table: 'ps_order_state', endpoint: 'order_states', tag: 'order_state', soft: true },
  { label: 'Langues statuts commandes', table: 'ps_order_state_lang', endpoint: 'order_state_langs', tag: 'order_state_lang', soft: true },
  { label: 'Retours commandes', table: 'ps_order_return', endpoint: 'order_returns', tag: 'order_return', soft: true },
  { label: 'Détails retours', table: 'ps_order_return_detail', endpoint: 'order_return_details', tag: 'order_return_detail', soft: true },
  { label: 'Statuts retours', table: 'ps_order_return_state', endpoint: 'order_return_states', tag: 'order_return_state', soft: true },
  { label: 'Langues statuts retours', table: 'ps_order_return_state_lang', endpoint: 'order_return_state_langs', tag: 'order_return_state_lang', soft: true },
  { label: 'Messages commandes', table: 'ps_customer_message', endpoint: 'customer_messages', tag: 'customer_message', soft: true },
  { label: 'Sync IMAP messages', table: 'ps_customer_message_sync_imap', endpoint: 'customer_message_sync_imaps', tag: 'customer_message_sync_imap', soft: true },
  { label: 'Threads clients', table: 'ps_customer_thread', endpoint: 'customer_threads', tag: 'customer_thread', soft: true },
  { label: 'Messages', table: 'ps_message', endpoint: 'messages', tag: 'message', soft: true },
  { label: 'Messages lus', table: 'ps_message_readed', endpoint: 'message_readeds', tag: 'message_readed', soft: true },
  { label: 'Transporteurs commandes', table: 'ps_order_carrier', endpoint: 'order_carriers', tag: 'order_carrier', soft: true },
  { label: 'Règles panier commandes', table: 'ps_order_cart_rule', endpoint: 'order_cart_rules', tag: 'order_cart_rule', soft: true },
  { label: 'Factures', table: 'ps_order_invoice', endpoint: 'order_invoices', tag: 'order_invoice', soft: true },
  { label: 'Taxes factures', table: 'ps_order_invoice_tax', endpoint: 'order_invoice_taxes', tag: 'order_invoice_tax', soft: true },
  { label: 'Paiements factures', table: 'ps_order_invoice_payment', endpoint: 'order_invoice_payments', tag: 'order_invoice_payment', soft: true },
  { label: 'Paiements', table: 'ps_order_payment', endpoint: 'order_payments', tag: 'order_payment', soft: true },
  { label: 'Avoirs', table: 'ps_order_slip', endpoint: 'order_slips', tag: 'order_slip', soft: true },
  { label: 'Détails avoirs', table: 'ps_order_slip_detail', endpoint: 'order_slip_details', tag: 'order_slip_detail', soft: true },
  
  // =====================================================
  // === STOCK & ENTREPÔTS (11 tables) ===
  // =====================================================
  { label: 'Stock disponible', table: 'ps_stock_available', endpoint: 'stock_availables', tag: 'stock_available', soft: true },
  { label: 'Mouvements stock', table: 'ps_stock_mvt', endpoint: 'stock_movements', tag: 'stock_mvt', soft: true },
  { label: 'Raisons mouvements', table: 'ps_stock_mvt_reason', endpoint: 'stock_mvt_reasons', tag: 'stock_mvt_reason', soft: true },
  { label: 'Langues raisons', table: 'ps_stock_mvt_reason_lang', endpoint: 'stock_mvt_reason_langs', tag: 'stock_mvt_reason_lang', soft: true },
  { label: 'Stock', table: 'ps_stock', endpoint: 'stocks', tag: 'stock', soft: true },
  { label: 'Entrepôts', table: 'ps_warehouse', endpoint: 'warehouses', tag: 'warehouse', soft: true },
  { label: 'Produits entrepôts', table: 'ps_warehouse_product_location', endpoint: 'warehouse_product_locations', tag: 'warehouse_product_location', soft: true },
  { label: 'Entrepôts - Transporteurs', table: 'ps_warehouse_carrier', endpoint: 'warehouse_carriers', tag: 'warehouse_carrier', soft: true },
  { label: 'Entrepôts - Boutiques', table: 'ps_warehouse_shop', endpoint: 'warehouse_shops', tag: 'warehouse_shop', soft: true },
  { label: 'Commandes fournisseur', table: 'ps_supply_order', endpoint: 'supply_orders', tag: 'supply_order', soft: true },
  { label: 'Détails commandes fournisseur', table: 'ps_supply_order_detail', endpoint: 'supply_order_details', tag: 'supply_order_detail', soft: true },
  { label: 'Historique commandes fournisseur', table: 'ps_supply_order_history', endpoint: 'supply_order_histories', tag: 'supply_order_history', soft: true },
  { label: 'Réception commandes fournisseur', table: 'ps_supply_order_receipt_history', endpoint: 'supply_order_receipt_histories', tag: 'supply_order_receipt_history', soft: true },
  { label: 'Statuts commandes fournisseur', table: 'ps_supply_order_state', endpoint: 'supply_order_states', tag: 'supply_order_state', soft: true },
  { label: 'Langues statuts fournisseur', table: 'ps_supply_order_state_lang', endpoint: 'supply_order_state_langs', tag: 'supply_order_state_lang', soft: true },
  
  // =====================================================
  // === LIVRAISON & TRANSPORT (18 tables) ===
  // =====================================================
  { label: 'Transporteurs', table: 'ps_carrier', endpoint: 'carriers', tag: 'carrier', soft: true },
  { label: 'Groupes transporteurs', table: 'ps_carrier_group', endpoint: 'carrier_groups', tag: 'carrier_group', soft: true },
  { label: 'Langues transporteurs', table: 'ps_carrier_lang', endpoint: 'carrier_langs', tag: 'carrier_lang', soft: true },
  { label: 'Boutiques transporteurs', table: 'ps_carrier_shop', endpoint: 'carrier_shops', tag: 'carrier_shop', soft: true },
  { label: 'Zones transporteurs', table: 'ps_carrier_zone', endpoint: 'carrier_zones', tag: 'carrier_zone', soft: true },
  { label: 'Règles taxes transporteurs', table: 'ps_carrier_tax_rules_group_shop', endpoint: 'carrier_tax_rules_group_shops', tag: 'carrier_tax_rules_group_shop', soft: true },
  { label: 'Produits - Transporteurs', table: 'ps_product_carrier', endpoint: 'product_carriers', tag: 'product_carrier', soft: true },
  { label: 'Zones', table: 'ps_zone', endpoint: 'zones', tag: 'zone', soft: true },
  { label: 'Boutiques zones', table: 'ps_zone_shop', endpoint: 'zone_shops', tag: 'zone_shop', soft: true },
  { label: 'Pays', table: 'ps_country', endpoint: 'countries', tag: 'country', soft: true },
  { label: 'Langues pays', table: 'ps_country_lang', endpoint: 'country_langs', tag: 'country_lang', soft: true },
  { label: 'Boutiques pays', table: 'ps_country_shop', endpoint: 'country_shops', tag: 'country_shop', soft: true },
  { label: 'États/Régions', table: 'ps_state', endpoint: 'states', tag: 'state', soft: true },
  { label: 'Gammes prix', table: 'ps_range_price', endpoint: 'range_prices', tag: 'range_price', soft: true },
  { label: 'Gammes poids', table: 'ps_range_weight', endpoint: 'range_weights', tag: 'range_weight', soft: true },
  { label: 'Livraison', table: 'ps_delivery', endpoint: 'deliveries', tag: 'delivery', soft: true },
  
  // =====================================================
  // === TAXES & CONFIGURATION (18 tables) ===
  // =====================================================
  { label: 'Taxes', table: 'ps_tax', endpoint: 'taxes', tag: 'tax', soft: true },
  { label: 'Langues taxes', table: 'ps_tax_lang', endpoint: 'tax_langs', tag: 'tax_lang', soft: true },
  { label: 'Règles taxes', table: 'ps_tax_rule', endpoint: 'tax_rules', tag: 'tax_rule', soft: true },
  { label: 'Groupes règles taxes', table: 'ps_tax_rules_group', endpoint: 'tax_rule_groups', tag: 'tax_rule_group', soft: true },
  { label: 'Boutiques groupes taxes', table: 'ps_tax_rules_group_shop', endpoint: 'tax_rule_group_shops', tag: 'tax_rule_group_shop', soft: true },
  { label: 'Devises', table: 'ps_currency', endpoint: 'currencies', tag: 'currency', soft: true },
  { label: 'Langues devises', table: 'ps_currency_lang', endpoint: 'currency_langs', tag: 'currency_lang', soft: true },
  { label: 'Boutiques devises', table: 'ps_currency_shop', endpoint: 'currency_shops', tag: 'currency_shop', soft: true },
  { label: 'Langues', table: 'ps_lang', endpoint: 'languages', tag: 'language', soft: true },
  { label: 'Boutiques langues', table: 'ps_lang_shop', endpoint: 'lang_shops', tag: 'lang_shop', soft: true },
  { label: 'Contacts', table: 'ps_contact', endpoint: 'contacts', tag: 'contact', soft: true },
  { label: 'Langues contacts', table: 'ps_contact_lang', endpoint: 'contact_langs', tag: 'contact_lang', soft: true },
  { label: 'Boutiques contacts', table: 'ps_contact_shop', endpoint: 'contact_shops', tag: 'contact_shop', soft: true },
  { label: 'Boutiques', table: 'ps_shop', endpoint: 'shops', tag: 'shop', soft: true },
  { label: 'Groupes boutiques', table: 'ps_shop_group', endpoint: 'shop_groups', tag: 'shop_group', soft: true },
  { label: 'URLs boutiques', table: 'ps_shop_url', endpoint: 'shop_urls', tag: 'shop_url', soft: true },
  { label: 'Magasins physiques', table: 'ps_store', endpoint: 'stores', tag: 'store', soft: true },
  { label: 'Langues magasins', table: 'ps_store_lang', endpoint: 'store_langs', tag: 'store_lang', soft: true },
  { label: 'Boutiques magasins', table: 'ps_store_shop', endpoint: 'store_shops', tag: 'store_shop', soft: true },
  { label: 'Configuration', table: 'ps_configuration', endpoint: 'configurations', tag: 'configuration', soft: true },
  { label: 'Langues configuration', table: 'ps_configuration_lang', endpoint: 'configuration_langs', tag: 'configuration_lang', soft: true },
  { label: 'KPI configuration', table: 'ps_configuration_kpi', endpoint: 'configuration_kpis', tag: 'configuration_kpi', soft: true },
  { label: 'Langues KPI', table: 'ps_configuration_kpi_lang', endpoint: 'configuration_kpi_langs', tag: 'configuration_kpi_lang', soft: true },
  { label: 'Fuseaux horaires', table: 'ps_timezone', endpoint: 'timezones', tag: 'timezone', soft: true },
  { label: 'Risques', table: 'ps_risk', endpoint: 'risks', tag: 'risk', soft: true },
  { label: 'Langues risques', table: 'ps_risk_lang', endpoint: 'risk_langs', tag: 'risk_lang', soft: true },
  
  // =====================================================
  // === CMS & CONTENU (12 tables) ===
  // =====================================================
  { label: 'Pages CMS', table: 'ps_cms', endpoint: 'cms', tag: 'cms', soft: true },
  { label: 'Catégories CMS', table: 'ps_cms_category', endpoint: 'cms_categories', tag: 'cms_category', soft: true },
  { label: 'Langues catégories CMS', table: 'ps_cms_category_lang', endpoint: 'cms_category_langs', tag: 'cms_category_lang', soft: true },
  { label: 'Boutiques catégories CMS', table: 'ps_cms_category_shop', endpoint: 'cms_category_shops', tag: 'cms_category_shop', soft: true },
  { label: 'Langues CMS', table: 'ps_cms_lang', endpoint: 'cms_langs', tag: 'cms_lang', soft: true },
  { label: 'Boutiques CMS', table: 'ps_cms_shop', endpoint: 'cms_shops', tag: 'cms_shop', soft: true },
  { label: 'Rôles CMS', table: 'ps_cms_role', endpoint: 'cms_roles', tag: 'cms_role', soft: true },
  { label: 'Langues rôles CMS', table: 'ps_cms_role_lang', endpoint: 'cms_role_langs', tag: 'cms_role_lang', soft: true },
  { label: 'Pièces jointes langues', table: 'ps_attachment_lang', endpoint: 'attachment_langs', tag: 'attachment_lang', soft: true },
  { label: 'Infos', table: 'ps_info', endpoint: 'infos', tag: 'info', soft: true },
  { label: 'Langues infos', table: 'ps_info_lang', endpoint: 'info_langs', tag: 'info_lang', soft: true },
  { label: 'Boutiques infos', table: 'ps_info_shop', endpoint: 'info_shops', tag: 'info_shop', soft: true },
  
  // =====================================================
  // === EMPLOYÉS & PERMISSIONS (14 tables) ===
  // =====================================================
  { label: 'Employés', table: 'ps_employee', endpoint: 'employees', tag: 'employee', soft: true },
  { label: 'Comptes employés', table: 'ps_employee_account', endpoint: 'employee_accounts', tag: 'employee_account', soft: true },
  { label: 'Sessions employés', table: 'ps_employee_session', endpoint: 'employee_sessions', tag: 'employee_session', soft: true },
  { label: 'Boutiques employés', table: 'ps_employee_shop', endpoint: 'employee_shops', tag: 'employee_shop', soft: true },
  { label: 'Profils', table: 'ps_profile', endpoint: 'profiles', tag: 'profile', soft: true },
  { label: 'Langues profils', table: 'ps_profile_lang', endpoint: 'profile_langs', tag: 'profile_lang', soft: true },
  { label: 'Accès/Permissions', table: 'ps_access', endpoint: 'accesses', tag: 'access', soft: true },
  { label: 'Rôles autorisation', table: 'ps_authorization_role', endpoint: 'authorization_roles', tag: 'authorization_role', soft: true },
  { label: 'Accès rapide', table: 'ps_quick_access', endpoint: 'quick_accesses', tag: 'quick_access', soft: true },
  { label: 'Langues accès rapide', table: 'ps_quick_access_lang', endpoint: 'quick_access_langs', tag: 'quick_access_lang', soft: true },
  { label: 'Onglets', table: 'ps_tab', endpoint: 'tabs', tag: 'tab', soft: true },
  { label: 'Conseils onglets', table: 'ps_tab_advice', endpoint: 'tab_advices', tag: 'tab_advice', soft: true },
  { label: 'Langues onglets', table: 'ps_tab_lang', endpoint: 'tab_langs', tag: 'tab_lang', soft: true },
  { label: 'Modules onglets', table: 'ps_tab_module_preference', endpoint: 'tab_module_preferences', tag: 'tab_module_preference', soft: true },
  
  // =====================================================
  // === MODULES (12 tables) ===
  // =====================================================
  { label: 'Modules', table: 'ps_module', endpoint: 'modules', tag: 'module', soft: true },
  { label: 'Accès modules', table: 'ps_module_access', endpoint: 'module_accesses', tag: 'module_access', soft: true },
  { label: 'Transporteurs modules', table: 'ps_module_carrier', endpoint: 'module_carriers', tag: 'module_carrier', soft: true },
  { label: 'Pays modules', table: 'ps_module_country', endpoint: 'module_countries', tag: 'module_country', soft: true },
  { label: 'Devises modules', table: 'ps_module_currency', endpoint: 'module_currencies', tag: 'module_currency', soft: true },
  { label: 'Groupes modules', table: 'ps_module_group', endpoint: 'module_groups', tag: 'module_group', soft: true },
  { label: 'Historique modules', table: 'ps_module_history', endpoint: 'module_histories', tag: 'module_history', soft: true },
  { label: 'Préférences modules', table: 'ps_module_preference', endpoint: 'module_preferences', tag: 'module_preference', soft: true },
  { label: 'Boutiques modules', table: 'ps_module_shop', endpoint: 'module_shops', tag: 'module_shop', soft: true },
  { label: 'Hooks', table: 'ps_hook', endpoint: 'hooks', tag: 'hook', soft: true },
  { label: 'Alias hooks', table: 'ps_hook_alias', endpoint: 'hook_aliases', tag: 'hook_alias', soft: true },
  { label: 'Modules hooks', table: 'ps_hook_module', endpoint: 'hook_modules', tag: 'hook_module', soft: true },
  { label: 'Exceptions hooks modules', table: 'ps_hook_module_exceptions', endpoint: 'hook_module_exceptions', tag: 'hook_module_exception', soft: true },
  { label: 'Apps autorisées', table: 'ps_authorized_application', endpoint: 'authorized_applications', tag: 'authorized_application', soft: true },
  
  // =====================================================
  // === WEBSERVICE (3 tables) ===
  // =====================================================
  { label: 'Comptes webservice', table: 'ps_webservice_account', endpoint: 'webservice_accounts', tag: 'webservice_account', soft: true },
  { label: 'Boutiques webservice', table: 'ps_webservice_account_shop', endpoint: 'webservice_account_shops', tag: 'webservice_account_shop', soft: true },
  { label: 'Permissions webservice', table: 'ps_webservice_permission', endpoint: 'webservice_permissions', tag: 'webservice_permission', soft: true },
  
  // =====================================================
  // === STATISTIQUES & LOGS (15 tables) ===
  // =====================================================
  { label: 'Recherches', table: 'ps_search_word', endpoint: 'search_words', tag: 'search_word', soft: true },
  { label: 'Index recherche', table: 'ps_search_index', endpoint: 'search_indexes', tag: 'search_index', soft: true },
  { label: 'Moteurs recherche', table: 'ps_search_engine', endpoint: 'search_engines', tag: 'search_engine', soft: true },
  { label: 'Statistiques recherches', table: 'ps_statssearch', endpoint: 'statssearches', tag: 'statssearch', soft: true },
  { label: 'Connections', table: 'ps_connections', endpoint: 'connections', tag: 'connection', soft: true },
  { label: 'Pages connections', table: 'ps_connections_page', endpoint: 'connections_pages', tag: 'connections_page', soft: true },
  { label: 'Sources connections', table: 'ps_connections_source', endpoint: 'connections_sources', tag: 'connections_source', soft: true },
  { label: 'Navigateurs', table: 'ps_web_browser', endpoint: 'web_browsers', tag: 'web_browser', soft: true },
  { label: 'Systèmes exploitation', table: 'ps_operating_system', endpoint: 'operating_systems', tag: 'operating_system', soft: true },
  { label: 'Pages vues', table: 'ps_page', endpoint: 'pages', tag: 'page', soft: true },
  { label: 'Types pages', table: 'ps_page_type', endpoint: 'page_types', tag: 'page_type', soft: true },
  { label: 'Pages vues stats', table: 'ps_page_viewed', endpoint: 'page_vieweds', tag: 'page_viewed', soft: true },
  { label: 'Pages introuvables', table: 'ps_pagenotfound', endpoint: 'pagenotfounds', tag: 'pagenotfound', soft: true },
  { label: 'Logs', table: 'ps_log', endpoint: 'logs', tag: 'log', soft: true },
  { label: 'Dates plages', table: 'ps_date_range', endpoint: 'date_ranges', tag: 'date_range', soft: true },
  
  // =====================================================
  // === LISTES DE SOUHAITS & COMMENTAIRES (10 tables) ===
  // =====================================================
  { label: 'Listes de souhaits', table: 'ps_wishlist', endpoint: 'wishlists', tag: 'wishlist', soft: true },
  { label: 'Produits listes souhaits', table: 'ps_wishlist_product', endpoint: 'wishlist_products', tag: 'wishlist_product', soft: true },
  { label: 'Paniers produits souhaits', table: 'ps_wishlist_product_cart', endpoint: 'wishlist_product_carts', tag: 'wishlist_product_cart', soft: true },
  { label: 'Stats listes souhaits', table: 'ps_blockwishlist_statistics', endpoint: 'blockwishlist_statistics', tag: 'blockwishlist_statistic', soft: true },
  { label: 'Commentaires produits', table: 'ps_product_comment', endpoint: 'product_comments', tag: 'product_comment', soft: true },
  { label: 'Critères commentaires', table: 'ps_product_comment_criterion', endpoint: 'product_comment_criteria', tag: 'product_comment_criterion', soft: true },
  { label: 'Catégories critères', table: 'ps_product_comment_criterion_category', endpoint: 'product_comment_criterion_categories', tag: 'product_comment_criterion_category', soft: true },
  { label: 'Langues critères', table: 'ps_product_comment_criterion_lang', endpoint: 'product_comment_criterion_langs', tag: 'product_comment_criterion_lang', soft: true },
  { label: 'Notes commentaires', table: 'ps_product_comment_grade', endpoint: 'product_comment_grades', tag: 'product_comment_grade', soft: true },
  { label: 'Signalements commentaires', table: 'ps_product_comment_report', endpoint: 'product_comment_reports', tag: 'product_comment_report', soft: true },
  { label: 'Utilité commentaires', table: 'ps_product_comment_usefulness', endpoint: 'product_comment_usefulnesses', tag: 'product_comment_usefulness', soft: true },
  
  // =====================================================
  // === MARKETING & SEO (10 tables) ===
  // =====================================================
  { label: 'Méta données', table: 'ps_meta', endpoint: 'metas', tag: 'meta', soft: true },
  { label: 'Langues méta', table: 'ps_meta_lang', endpoint: 'meta_langs', tag: 'meta_lang', soft: true },
  { label: 'Alias', table: 'ps_alias', endpoint: 'aliases', tag: 'alias', soft: true },
  { label: 'Correspondances import', table: 'ps_import_match', endpoint: 'import_matches', tag: 'import_match', soft: true },
  { label: 'Réductions catalogue', table: 'ps_specific_price_rule', endpoint: 'specific_price_rules', tag: 'specific_price_rule', soft: true },
  { label: 'Conditions règles', table: 'ps_specific_price_rule_condition', endpoint: 'specific_price_rule_conditions', tag: 'specific_price_rule_condition', soft: true },
  { label: 'Groupes conditions', table: 'ps_specific_price_rule_condition_group', endpoint: 'specific_price_rule_condition_groups', tag: 'specific_price_rule_condition_group', soft: true },
  { label: 'Conseils', table: 'ps_advice', endpoint: 'advices', tag: 'advice', soft: true },
  { label: 'Langues conseils', table: 'ps_advice_lang', endpoint: 'advice_langs', tag: 'advice_lang', soft: true },
  { label: 'Conditions', table: 'ps_condition', endpoint: 'conditions', tag: 'condition', soft: true },
  { label: 'Conseils conditions', table: 'ps_condition_advice', endpoint: 'condition_advices', tag: 'condition_advice', soft: true },
  { label: 'Abonnements newsletter', table: 'ps_emailsubscription', endpoint: 'emailsubscriptions', tag: 'emailsubscription', soft: true },
  { label: 'Alertes mail rupture', table: 'ps_mailalert_customer_oos', endpoint: 'mailalert_customer_oos', tag: 'mailalert_customer_oos', soft: true },
  { label: 'Sitemaps', table: 'ps_gsitemap_sitemap', endpoint: 'gsitemap_sitemaps', tag: 'gsitemap_sitemap', soft: true },
  
  // =====================================================
  // === MAILS & NOTIFICATIONS (2 tables) ===
  // =====================================================
  { label: 'Mails', table: 'ps_mail', endpoint: 'mails', tag: 'mail', soft: true },
  
  // =====================================================
  // === DIVERS & INTERNE (25 tables) ===
  // =====================================================
  { label: 'Personnalisation', table: 'ps_customization', endpoint: 'customizations', tag: 'customization', soft: true },
  { label: 'Champs personnalisation', table: 'ps_customization_field', endpoint: 'customization_fields', tag: 'customization_field', soft: true },
  { label: 'Langues champs perso', table: 'ps_customization_field_lang', endpoint: 'customization_field_langs', tag: 'customization_field_lang', soft: true },
  { label: 'Données personnalisées', table: 'ps_customized_data', endpoint: 'customized_datas', tag: 'customized_data', soft: true },
  { label: 'Filtres admin', table: 'ps_admin_filter', endpoint: 'admin_filters', tag: 'admin_filter', soft: true },
  { label: 'Requêtes SQL', table: 'ps_request_sql', endpoint: 'request_sqls', tag: 'request_sql', soft: true },
  { label: 'Champs requis', table: 'ps_required_field', endpoint: 'required_fields', tag: 'required_field', soft: true },
  { label: 'Cache Smarty', table: 'ps_smarty_cache', endpoint: 'smarty_caches', tag: 'smarty_cache', soft: true },
  { label: 'Dernier flush Smarty', table: 'ps_smarty_last_flush', endpoint: 'smarty_last_flushes', tag: 'smarty_last_flush', soft: true },
  { label: 'Cache lazy Smarty', table: 'ps_smarty_lazy_cache', endpoint: 'smarty_lazy_caches', tag: 'smarty_lazy_cache', soft: true },
  { label: 'Sessions', table: 'ps_guest', endpoint: 'guests', tag: 'guest', soft: true },
  { label: 'Homeslider', table: 'ps_homeslider', endpoint: 'homesliders', tag: 'homeslider', soft: true },
  { label: 'Slides', table: 'ps_homeslider_slides', endpoint: 'homeslider_slides', tag: 'homeslider_slide', soft: true },
  { label: 'Langues slides', table: 'ps_homeslider_slides_lang', endpoint: 'homeslider_slide_langs', tag: 'homeslider_slides_lang', soft: true },
  { label: 'Slides lien', table: 'ps_linksmenutop', endpoint: 'linksmenutops', tag: 'linksmenutop', soft: true },
  { label: 'Langues slides lien', table: 'ps_linksmenutop_lang', endpoint: 'linksmenutop_langs', tag: 'linksmenutop_lang', soft: true },
  { label: 'Blocs liens', table: 'ps_link_block', endpoint: 'link_blocks', tag: 'link_block', soft: true },
  { label: 'Langues blocs liens', table: 'ps_link_block_lang', endpoint: 'link_block_langs', tag: 'link_block_lang', soft: true },
  { label: 'Boutiques blocs liens', table: 'ps_link_block_shop', endpoint: 'link_block_shops', tag: 'link_block_shop', soft: true },
  { label: 'Filtrage catégories', table: 'ps_layered_category', endpoint: 'layered_categories', tag: 'layered_category', soft: true },
  { label: 'Filtres', table: 'ps_layered_filter', endpoint: 'layered_filters', tag: 'layered_filter', soft: true },
  { label: 'Blocs filtres', table: 'ps_layered_filter_block', endpoint: 'layered_filter_blocks', tag: 'layered_filter_block', soft: true },
  { label: 'Boutiques filtres', table: 'ps_layered_filter_shop', endpoint: 'layered_filter_shops', tag: 'layered_filter_shop', soft: true },
  { label: 'Attributs indexables', table: 'ps_layered_indexable_attribute_group', endpoint: 'layered_indexable_attribute_groups', tag: 'layered_indexable_attribute_group', soft: true },
  { label: 'Valeurs attributs langues', table: 'ps_layered_indexable_attribute_group_lang_value', endpoint: 'layered_indexable_attribute_group_lang_values', tag: 'layered_indexable_attribute_group_lang_value', soft: true },
  { label: 'Attributs langues', table: 'ps_layered_indexable_attribute_lang_value', endpoint: 'layered_indexable_attribute_lang_values', tag: 'layered_indexable_attribute_lang_value', soft: true },
  { label: 'Caractéristiques indexables', table: 'ps_layered_indexable_feature', endpoint: 'layered_indexable_features', tag: 'layered_indexable_feature', soft: true },
  { label: 'Caractéristiques langues', table: 'ps_layered_indexable_feature_lang_value', endpoint: 'layered_indexable_feature_lang_values', tag: 'layered_indexable_feature_lang_value', soft: true },
  { label: 'Valeurs caractéristiques langues', table: 'ps_layered_indexable_feature_value_lang_value', endpoint: 'layered_indexable_feature_value_lang_values', tag: 'layered_indexable_feature_value_lang_value', soft: true },
  { label: 'Index prix', table: 'ps_layered_price_index', endpoint: 'layered_price_indexes', tag: 'layered_price_index', soft: true },
  { label: 'Produits attributs', table: 'ps_layered_product_attribute', endpoint: 'layered_product_attributes', tag: 'layered_product_attribute', soft: true },
  { label: 'Configuration MBO', table: 'ps_mbo_api_config', endpoint: 'mbo_api_configs', tag: 'mbo_api_config', soft: true },
  { label: 'Jobs MBO', table: 'ps_mbo_job', endpoint: 'mbo_jobs', tag: 'mbo_job', soft: true },
  { label: 'Serveurs memcached', table: 'ps_memcached_servers', endpoint: 'memcached_servers', tag: 'memcached_server', soft: true },
  { label: 'Catégories FB', table: 'ps_fb_category_match', endpoint: 'fb_category_matchs', tag: 'fb_category_match', soft: true },
  { label: 'Boutiques attributs', table: 'ps_attribute_shop', endpoint: 'attribute_shops', tag: 'attribute_shop', soft: true },
  { label: 'Langues attributs', table: 'ps_attribute_lang', endpoint: 'attribute_langs', tag: 'attribute_lang', soft: true },
  { label: 'Boutiques groupes attributs', table: 'ps_attribute_group_shop', endpoint: 'attribute_group_shops', tag: 'attribute_group_shop', soft: true },
  { label: 'Langues groupes attributs', table: 'ps_attribute_group_lang', endpoint: 'attribute_group_langs', tag: 'attribute_group_lang', soft: true },
  { label: 'Boutiques images', table: 'ps_image_shop', endpoint: 'image_shops', tag: 'image_shop', soft: true },
  { label: 'Langues images', table: 'ps_image_lang', endpoint: 'image_langs', tag: 'image_lang', soft: true },
  { label: 'Catégories groupe', table: 'ps_category_group', endpoint: 'category_groups', tag: 'category_group', soft: true },
  { label: 'Langues catégories', table: 'ps_category_lang', endpoint: 'category_langs', tag: 'category_lang', soft: true },
  { label: 'Boutiques catégories', table: 'ps_category_shop', endpoint: 'category_shops', tag: 'category_shop', soft: true },
  { label: 'Langues fabricants', table: 'ps_manufacturer_lang', endpoint: 'manufacturer_langs', tag: 'manufacturer_lang', soft: true },
  { label: 'Boutiques fabricants', table: 'ps_manufacturer_shop', endpoint: 'manufacturer_shops', tag: 'manufacturer_shop', soft: true },
  { label: 'Langues fournisseurs', table: 'ps_supplier_lang', endpoint: 'supplier_langs', tag: 'supplier_lang', soft: true },
  { label: 'Boutiques fournisseurs', table: 'ps_supplier_shop', endpoint: 'supplier_shops', tag: 'supplier_shop', soft: true },
  { label: 'Produits boutique', table: 'ps_product_shop', endpoint: 'product_shops', tag: 'product_shop', soft: true },
  { label: 'Langues produits', table: 'ps_product_lang', endpoint: 'product_langs', tag: 'product_lang', soft: true },
  { label: 'Boutiques langues caractéristiques', table: 'ps_feature_shop', endpoint: 'feature_shops', tag: 'feature_shop', soft: true },
  { label: 'Langues caractéristiques', table: 'ps_feature_lang', endpoint: 'feature_langs', tag: 'feature_lang', soft: true },
  { label: 'Produits caractéristiques', table: 'ps_feature_product', endpoint: 'feature_products', tag: 'feature_product', soft: true },
  { label: 'Boutiques valeurs caractéristiques', table: 'ps_feature_value_lang', endpoint: 'feature_value_langs', tag: 'feature_value_lang', soft: true },
  { label: 'Tags count', table: 'ps_tag_count', endpoint: 'tag_counts', tag: 'tag_count', soft: true },
  { label: 'API Access', table: 'ps_api_access', endpoint: 'api_accesses', tag: 'api_access', soft: true },
  { label: 'Feature flags', table: 'ps_feature_flag', endpoint: 'feature_flags', tag: 'feature_flag', soft: true },
  { label: 'Google Analytics', table: 'ps_ganalytics', endpoint: 'ganalytics', tag: 'ganalytics', soft: true },
  { label: 'Données GA', table: 'ps_ganalytics_data', endpoint: 'ganalytics_datas', tag: 'ganalytics_data', soft: true },
  { label: 'Paiements PayPal Checkout', table: 'ps_pscheckout_authorization', endpoint: 'pscheckout_authorizations', tag: 'pscheckout_authorization', soft: true },
  { label: 'Captures PayPal', table: 'ps_pscheckout_capture', endpoint: 'pscheckout_captures', tag: 'pscheckout_capture', soft: true },
  { label: 'Paniers PayPal', table: 'ps_pscheckout_cart', endpoint: 'pscheckout_carts', tag: 'pscheckout_cart', soft: true },
  { label: 'Clients PayPal', table: 'ps_pscheckout_customer', endpoint: 'pscheckout_customers', tag: 'pscheckout_customer', soft: true },
  { label: 'Sources financement', table: 'ps_pscheckout_funding_source', endpoint: 'pscheckout_funding_sources', tag: 'pscheckout_funding_source', soft: true },
  { label: 'Commandes PayPal', table: 'ps_pscheckout_order', endpoint: 'pscheckout_orders', tag: 'pscheckout_order', soft: true },
  { label: 'Matrices commandes', table: 'ps_pscheckout_order_matrice', endpoint: 'pscheckout_order_matrices', tag: 'pscheckout_order_matrice', soft: true },
  { label: 'Tokens paiement', table: 'ps_pscheckout_payment_token', endpoint: 'pscheckout_payment_tokens', tag: 'pscheckout_payment_token', soft: true },
  { label: 'Unités achat', table: 'ps_pscheckout_purchase_unit', endpoint: 'pscheckout_purchase_units', tag: 'pscheckout_purchase_unit', soft: true },
  { label: 'Remboursements', table: 'ps_pscheckout_refund', endpoint: 'pscheckout_refunds', tag: 'pscheckout_refund', soft: true },
  { label: 'Tracking', table: 'ps_pscheckout_tracking', endpoint: 'pscheckout_trackings', tag: 'pscheckout_tracking', soft: true },
  { label: 'Consentements GDPR', table: 'ps_psgdpr_consent', endpoint: 'psgdpr_consents', tag: 'psgdpr_consent', soft: true },
  { label: 'Langues consentements', table: 'ps_psgdpr_consent_lang', endpoint: 'psgdpr_consent_langs', tag: 'psgdpr_consent_lang', soft: true },
  { label: 'Logs GDPR', table: 'ps_psgdpr_log', endpoint: 'psgdpr_logs', tag: 'psgdpr_log', soft: true },
  { label: 'Réassurance', table: 'ps_psreassurance', endpoint: 'psreassurances', tag: 'psreassurance', soft: true },
  { label: 'Langues réassurance', table: 'ps_psreassurance_lang', endpoint: 'psreassurance_langs', tag: 'psreassurance_lang', soft: true },
  { label: 'Sync EventBus', table: 'ps_eventbus_type_sync', endpoint: 'eventbus_type_syncs', tag: 'eventbus_type_sync', soft: true },
  { label: 'Jobs EventBus', table: 'ps_eventbus_job', endpoint: 'eventbus_jobs', tag: 'eventbus_job', soft: true },
  { label: 'Sync incrémentale', table: 'ps_eventbus_incremental_sync', endpoint: 'eventbus_incremental_syncs', tag: 'eventbus_incremental_sync', soft: true },
  { label: 'Live sync', table: 'ps_eventbus_live_sync', endpoint: 'eventbus_live_syncs', tag: 'eventbus_live_sync', soft: true },
];

// State
const selectedTable = ref('');
const selectedTables = ref<string[]>([]);
const searchQuery = ref('');
const showConfirm = ref(false);
const resetResult = ref<{ success: boolean; message: string } | null>(null);
const loading = ref(false);
const step = ref('');
const progress = ref(0);
const total = ref(0);
const tableStats = ref({ count: 0, loading: false });

// Computed
const filteredTables = computed(() => {
  if (!searchQuery.value) return tables;
  const query = searchQuery.value.toLowerCase();
  return tables.filter(t => 
    t.table.toLowerCase().includes(query) || 
    t.label.toLowerCase().includes(query)
  );
});

// Get current table info
const currentTable = () => tables.find(t => t.table === selectedTable.value);

// Methods
const checkTableCount = async () => {
  if (!selectedTable.value) {
    tableStats.value = { count: 0, loading: false };
    return;
  }

  const table = currentTable();
  if (!table) return;

  tableStats.value.loading = true;
  try {
    const res = await api.get(`/${table.endpoint}?output_format=XML&display=[id]&limit=1`);
    const doc = new DOMParser().parseFromString(res.data, 'text/xml');
    const elements = doc.getElementsByTagName(table.tag);
    tableStats.value.count = elements.length;
  } catch (e) {
    tableStats.value.count = 0;
  } finally {
    tableStats.value.loading = false;
  }
};

const confirmReset = () => {
  showConfirm.value = true;
};

const executeReset = async () => {
  showConfirm.value = false;
  resetResult.value = null;

  const table = currentTable();
  if (!table) return;

  loading.value = true;
  step.value = `Récupération des données ${table.label}...`;
  progress.value = 0;
  total.value = 0;

  try {
    // Récupérer tous les IDs
    const res = await api.get(`/${table.endpoint}?output_format=XML&display=[id]&limit=10000`);
    const doc = new DOMParser().parseFromString(res.data, 'text/xml');
    const elements = Array.from(doc.getElementsByTagName(table.tag));
    const skip = table.skip || [];
    const ids = elements
      .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
      .filter(id => id > 0 && !skip.includes(id));

    total.value = ids.length;

    if (ids.length === 0) {
      resetResult.value = {
        success: true,
        message: `Aucun enregistrement à supprimer dans ${table.label}.`
      };
      loading.value = false;
      return;
    }

    // Supprimer chaque élément
    for (const id of [...ids].sort((a, b) => b - a)) {
      try {
        await api.delete(`/${table.endpoint}/${id}`);
      } catch (e: any) {
        if (!table.soft) {
          throw new Error(`Erreur lors de la suppression de ${table.endpoint}/${id}`);
        }
      }
      progress.value++;
      step.value = `Suppression de ${table.label}... (${progress.value}/${total.value})`;
    }

    resetResult.value = {
      success: true,
      message: `${ids.length} élément(s) de ${table.label} ont été supprimés avec succès.`
    };

    // Rafraîchir le compteur
    await checkTableCount();

  } catch (e: any) {
    resetResult.value = {
      success: false,
      message: `Erreur : ${e.message || 'Une erreur est survenue'}`
    };
  } finally {
    loading.value = false;
  }
};

// Watch for table selection changes
const onTableChange = () => {
  resetResult.value = null;
  checkTableCount();
};

// Fonctions pour la sélection multiple
const selectAllTables = () => {
  selectedTables.value = filteredTables.value.map(table => table.table);
};

const clearAllTables = () => {
  selectedTables.value = [];
  selectedTable.value = '';
};

const toggleTableSelection = (tableName: string) => {
  const index = selectedTables.value.indexOf(tableName);
  if (index > -1) {
    selectedTables.value.splice(index, 1);
  } else {
    selectedTables.value.push(tableName);
  }
};

const isTableSelected = (tableName: string) => {
  return selectedTables.value.includes(tableName);
};

// Fonction pour réinitialiser plusieurs tables
const confirmMultipleReset = () => {
  if (selectedTables.value.length === 0) return;
  showConfirm.value = true;
};

const executeMultipleReset = async () => {
  showConfirm.value = false;
  resetResult.value = null;

  if (selectedTables.value.length === 0) return;

  loading.value = true;
  let totalDeleted = 0;
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const tableName of selectedTables.value) {
    const table = tables.find(t => t.table === tableName);
    if (!table) continue;

    try {
      step.value = `Traitement de ${table.label}...`;
      progress.value = totalDeleted;

      // Récupérer tous les IDs
      const res = await api.get(`/${table.endpoint}?output_format=XML&display=[id]&limit=10000`);
      const doc = new DOMParser().parseFromString(res.data, 'text/xml');
      const elements = Array.from(doc.getElementsByTagName(table.tag));
      const skip = table.skip || [];
      const ids = elements
        .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
        .filter(id => id > 0 && !skip.includes(id));

      if (ids.length === 0) {
        successCount++;
        continue;
      }

      // Supprimer chaque élément
      for (const id of [...ids].sort((a, b) => b - a)) {
        try {
          await api.delete(`/${table.endpoint}/${id}`);
          totalDeleted++;
        } catch (e: any) {
          if (!table.soft) {
            throw new Error(`Erreur lors de la suppression de ${table.endpoint}/${id}`);
          }
        }
      }

      successCount++;
    } catch (e: any) {
      errorCount++;
      errors.push(`${table.label}: ${e.message || 'Erreur inconnue'}`);
    }
  }

  if (errorCount === 0) {
    resetResult.value = {
      success: true,
      message: `${totalDeleted} élément(s) de ${successCount} table(s) ont été supprimés avec succès.`
    };
  } else {
    resetResult.value = {
      success: false,
      message: `${successCount} table(s) traitées avec succès, ${errorCount} erreur(s). ${errors.join(', ')}`
    };
  }

  // Nettoyer la sélection
  selectedTables.value = [];
  selectedTable.value = '';
  
  loading.value = false;
};
</script>

<template>
  <div class="layout">
    <Sidebar />

    <main class="main-content">
      <div class="content-wrapper">
        <div class="config-page">
          <div class="config-header">
            <h1>Configuration</h1>
          </div>

          <div class="config-content">
            <div class="config-card">
              <h2>Réinitialisation des données</h2>
              <p class="config-desc">
                Sélectionnez une table et cliquez sur le bouton pour supprimer toutes ses données.
                <strong class="warning">Cette action est irréversible !</strong>
              </p>

              <div class="form-group">
                <label>Sélectionner les tables ({{ tables.length }} tables disponibles via API)</label>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Rechercher une table..."
                  class="search-input"
                />
                
                <!-- Boutons de sélection multiple -->
                <div class="selection-buttons">
                  <button @click="selectAllTables" class="select-btn select-all">
                    Tout sélectionner
                  </button>
                  <button @click="clearAllTables" class="select-btn clear-all">
                    Tout effacer
                  </button>
                  <span class="selection-count">
                    {{ selectedTables.length }} table(s) sélectionnée(s)
                  </span>
                </div>

                <!-- Liste des tables avec checkboxes -->
                <div class="table-list">
                  <div 
                    v-for="table in filteredTables" 
                    :key="table.table"
                    class="table-item"
                    :class="{ selected: isTableSelected(table.table) }"
                    @click="toggleTableSelection(table.table)"
                  >
                    <input
                      type="checkbox"
                      :checked="isTableSelected(table.table)"
                      @change="toggleTableSelection(table.table)"
                      class="table-checkbox"
                    />
                    <div class="table-info">
                      <span class="table-name">{{ table.table }}</span>
                      <span class="table-label">{{ table.label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedTables.length > 0" class="table-info">
                <span class="record-count">
                  <strong>{{ selectedTables.length }}</strong> table(s) sélectionnée(s) pour la réinitialisation
                </span>
              </div>

              <button
                class="reset-btn"
                :disabled="selectedTables.length === 0 || loading"
                @click="confirmMultipleReset"
              >
                <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
                <span v-if="loading">
                  {{ step }} ({{ progress }}/{{ total }})
                </span>
                <span v-else>
                  Réinitialiser les données ({{ selectedTables.length }} table(s))
                </span>
              </button>

              <div v-if="resetResult" class="result-message" :class="{ success: resetResult.success, error: !resetResult.success }">
                {{ resetResult.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal de confirmation -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3>Confirmer la réinitialisation ?</h3>
          <p>
            Vous êtes sur le point de supprimer <strong>tous les enregistrements</strong> de 
            <strong>{{ selectedTables.length }} table(s)</strong> sélectionnée(s).
            <br>Cette opération est <strong>irréversible</strong>.
          </p>
          <div class="selected-tables-list">
            <strong>Tables concernées :</strong>
            <ul>
              <li v-for="tableName in selectedTables" :key="tableName">
                {{ tableName }} - {{ tables.find(t => t.table === tableName)?.label }}
              </li>
            </ul>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showConfirm = false">Annuler</button>
            <button class="btn-confirm" @click="executeMultipleReset">Oui, réinitialiser</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Overlay de progression -->
    <Teleport to="body">
      <div v-if="loading" class="progress-overlay">
        <div class="progress-box">
          <div class="spinner"></div>
          <p class="progress-step">{{ step }}</p>
          <div class="progress-bar-wrap">
            <div
              class="progress-bar-fill"
              :style="{ width: total > 0 ? (progress / total * 100) + '%' : '0%' }"
            ></div>
          </div>
          <p class="progress-count">{{ progress }} / {{ total }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Layout identique à CatalogView */
.layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  margin-left: 260px;
  flex: 1;
  background: #f5f6fa;
  min-height: 100vh;
}

.content-wrapper {
  padding: 30px;
  max-width: 1400px;
}

.config-page {
  max-width: 900px;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.config-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.config-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-card {
  padding: 32px;
}

.config-card h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #2c3e50;
}

.config-desc {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.warning {
  color: #e74c3c;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
}

/* Boutons de sélection multiple */
.selection-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.select-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn.select-all {
  background: #28a745;
  color: white;
}

.select-btn.select-all:hover {
  background: #218838;
}

.select-btn.clear-all {
  background: #dc3545;
  color: white;
}

.select-btn.clear-all:hover {
  background: #c82333;
}

.selection-count {
  margin-left: auto;
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

/* Liste des tables avec checkboxes */
.table-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
}

.table-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-item:hover {
  background-color: #f8f9fa;
}

.table-item.selected {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.table-item:last-child {
  border-bottom: none;
}

.table-checkbox {
  margin-right: 10px;
  cursor: pointer;
}

.table-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  font-family: 'Courier New', monospace;
}

.table-label {
  font-size: 11px;
  color: #7f8c8d;
}

/* Styles pour la liste des tables dans le modal */
.selected-tables-list {
  margin: 15px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  max-height: 200px;
  overflow-y: auto;
}

.selected-tables-list ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.selected-tables-list li {
  font-size: 12px;
  margin: 4px 0;
  color: #495057;
}

.table-select:focus {
  outline: none;
  border-color: #4CAF50;
}

.table-select option {
  padding: 6px 8px;
}

.table-info {
  background: #e3f2fd;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.table-info.empty {
  background: #fff3e0;
}

.record-count {
  color: #1976d2;
  font-size: 14px;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-1px);
}

.reset-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.reset-btn svg {
  width: 20px;
  height: 20px;
}

.result-message {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
}

.result-message.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.result-message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: #fef2f2;
  border-radius: 50%;
  margin: 0 auto 16px;
}

.modal h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #2c3e50;
}

.modal p {
  color: #555;
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel {
  padding: 10px 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 10px 24px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.btn-confirm:hover {
  background: #c0392b;
}

/* Progress overlay */
.progress-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.progress-box {
  background: white;
  border-radius: 12px;
  padding: 36px;
  min-width: 320px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid #f0f0f0;
  border-top-color: #e74c3c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-step {
  font-size: 15px;
  color: #2c3e50;
  margin-bottom: 16px;
  font-weight: 500;
}

.progress-bar-wrap {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar-fill {
  height: 100%;
  background: #e74c3c;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 13px;
  color: #999;
  margin: 0;
}
</style>
