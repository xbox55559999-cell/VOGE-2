import { RawData } from './types';

// Using a subset of the provided data structure to ensure the app runs correctly without exceeding limits.
// In a real scenario, this would be fetched from an API.
export const MOCK_DATA: RawData = {
    "total": {
        "count_sold": 6342,
        "total_sold_price": 4173073288,
        "total_buy_price": 3483730032.300001
    },
    "items": {
        "3": {
            "name": "Тятюшкин Александр Сергеевич ИП",
            "count_sold": 117,
            "total_buy_price": 54783000,
            "total_sold_price": 53227880,
            "url": "",
            "models": {
                "12": {
                    "name": "VOGE Rally 300",
                    "url": "",
                    "offers": {
                        "79": {
                            "count_sold": 1,
                            "name": "Classic | Black",
                            "total_sold_price": 375000,
                            "total_buy_price": 328000,
                            "vehicles": {
                                "86": { "vin": "LLCLGN1G3PA102942", "sale_date": "05.02.2024" }
                            }
                        },
                        "256": {
                             "count_sold": 3,
                             "name": "Classic | Желтый (Yellow, Y4W)",
                             "total_sold_price": 1191000,
                             "total_buy_price": 1113000,
                             "vehicles": {
                                 "8404": { "vin": "LLCLGN1G2SA100351", "sale_date": "26.06.2025" },
                                 "8740": { "vin": "LLCLGN1G7SA100152", "sale_date": "27.06.2025" },
                                 "8759": { "vin": "LLCLGN1G5SA100151", "sale_date": "24.05.2025" }
                             }
                        }
                    }
                },
                "23": {
                    "name": "VOGE AC350",
                    "url": "",
                    "offers": {
                        "124": {
                            "count_sold": 3,
                            "name": "Classic | Yellow",
                            "total_sold_price": 969000,
                            "total_buy_price": 1212000,
                            "vehicles": {
                                "320": { "vin": "LLCVPP106PA150782", "sale_date": "02.05.2024" },
                                "323": { "vin": "LLCVPP103PA150786", "sale_date": "14.06.2024" },
                                "4622": { "vin": "LLCVPP101PA150608", "sale_date": "26.06.2024" }
                            }
                        }
                    }
                }
            }
        },
        "5": {
            "name": "МОТОПАРК ООО (Тула)",
            "count_sold": 117,
            "total_buy_price": 59004000,
            "total_sold_price": 68319744,
            "url": "",
            "models": {
                "12": {
                    "name": "VOGE Rally 300",
                    "url": "",
                    "offers": {
                        "78": {
                            "count_sold": 1,
                            "name": "Classic | Yellow",
                            "total_sold_price": 375000,
                            "total_buy_price": 328000,
                            "vehicles": {
                                "57": { "vin": "LLCLGN1G8PA103004", "sale_date": "21.02.2024" }
                            }
                        }
                    }
                },
                "20": {
                    "name": "VOGE DS525X",
                    "url": "",
                    "offers": {
                        "166": {
                            "count_sold": 3,
                            "name": "Adventure | Grey",
                            "total_sold_price": 2370000,
                            "total_buy_price": 2025000,
                            "vehicles": {
                                "3142": { "vin": "LLCVPR1T2RA102933", "sale_date": "20.04.2024" },
                                "3154": { "vin": "LLCVPR1T5RA102960", "sale_date": "14.04.2024" },
                                "8063": { "vin": "LLCVPR1T5RA105955", "sale_date": "31.12.2024" }
                            }
                        }
                    }
                }
            }
        },
        "46": {
            "name": "АВИЛОН АГ АО (Москва)",
            "count_sold": 562,
            "total_buy_price": 352592394.37,
            "total_sold_price": 396605868,
            "url": "",
            "models": {
                "18": {
                    "name": "Скутер VOGE SR4 Max",
                    "url": "",
                    "offers": {
                        "159": {
                            "count_sold": 12,
                            "name": "Classic | Black",
                            "total_sold_price": 7110750,
                            "total_buy_price": 6784561.04,
                            "vehicles": {
                                "3406": { "vin": "LLCVTP5AXRS000251", "sale_date": "23.03.2024" },
                                "3418": { "vin": "LLCVTP5A2RS000258", "sale_date": "12.05.2024" },
                                "3422": { "vin": "LLCVTP5A9RS000256", "sale_date": "11.03.2024" },
                                "3430": { "vin": "LLCVTP5A4RS000214", "sale_date": "14.04.2024" },
                                "4846": { "vin": "LLCVTP5A1RS001840", "sale_date": "28.06.2024" },
                                "4847": { "vin": "LLCVTP5A1RS001837", "sale_date": "16.09.2024" },
                                "4852": { "vin": "LLCVTP5A1RS001823", "sale_date": "20.06.2024" },
                                "4857": { "vin": "LLCVTP5A3RS001872", "sale_date": "18.10.2024" },
                                "4861": { "vin": "LLCVTP5A4RS001816", "sale_date": "12.10.2024" },
                                "4872": { "vin": "LLCVTP5A1RS001854", "sale_date": "22.07.2024" },
                                "4875": { "vin": "LLCVTP5A1RS001868", "sale_date": "14.06.2024" },
                                "4884": { "vin": "LLCVTP5A2RS001815", "sale_date": "24.08.2024" }
                            }
                        }
                    }
                },
                "30": {
                    "name": "VOGE DS900X",
                    "url": "",
                    "offers": {
                         "300": {
                             "count_sold": 4,
                             "name": "Adventure | Black",
                             "total_sold_price": 4519000,
                             "total_buy_price": 4484000,
                             "vehicles": {
                                 "8029": { "vin": "LLCVPX1A9SA157016", "sale_date": "28.01.2025" },
                                 "10587": { "vin": "LLCVPX1A8SA160098", "sale_date": "28.08.2025" }
                             }
                         }
                    }
                }
            }
        },
        "25": {
             "name": "АКЦЕНТ - АВТО М ООО",
             "count_sold": 160,
             "total_buy_price": 83277000,
             "total_sold_price": 95652800,
             "url": "",
             "models": {
                 "3": {
                     "name": "VOGE R300",
                     "url": "",
                     "offers": {
                         "17": {
                             "count_sold": 2,
                             "name": "Classic | Red",
                             "total_sold_price": 716000,
                             "total_buy_price": 650000,
                             "vehicles": {
                                 "3": { "vin": "LLCLPN6J6PA100199", "sale_date": "20.05.2024" },
                                 "1773": { "vin": "LLCLPN6J0PA100196", "sale_date": "28.12.2024" }
                             }
                         }
                     }
                 }
             }
        }
    }
};